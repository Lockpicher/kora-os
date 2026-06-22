/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useRef, useTransition, useMemo, useEffect } from "react"
import { UploadCloud, CheckCircle2, AlertCircle, Download, Loader2, Filter, Search, ArrowRight, Settings2 } from "lucide-react"
import Papa from "papaparse"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { processImportDryRun, executeImport, CSVRow, ImportPreview } from "@/app/(dashboard)/products/import/actions"
import { useRouter } from "next/navigation"

interface NormalizedRow {
  _original: any
  Producto: string
  Variante: string
  SKU: string
  Costo: string
  Precio: string
  Stock: string
  Codigo_Barras: string
  Referencia_Externa: string
  Marca: string
  Categoria: string
  Estado: string
  Tipo: string
  URL_Imagen: string
  Activo: string
  _isExcluded: boolean
  _excludeReason?: string
  _isVisible?: boolean
}

type Step = 'upload' | 'mapping' | 'filtering' | 'success'

const KORA_FIELDS = [
  { key: "Producto", label: "Producto (Nombre)", required: true, autoMatch: ["name", "nombre", "producto", "title"] },
  { key: "SKU", label: "SKU", required: true, autoMatch: ["sku", "reference"] },
  { key: "Variante", label: "Variante (Nombre)", required: false, autoMatch: ["variante", "variant", "option"] },
  { key: "Precio", label: "Precio Regular", required: false, autoMatch: ["regular price", "price", "precio"] },
  { key: "Costo", label: "Costo", required: false, autoMatch: ["cost", "costo"] },
  { key: "Stock", label: "Inventario", required: false, autoMatch: ["stock", "quantity", "cantidad"] },
  { key: "Categoria", label: "Categoría", required: false, autoMatch: ["categories", "categoría", "categoria"] },
  { key: "Marca", label: "Marca", required: false, autoMatch: ["brand", "marca"] },
  { key: "Estado", label: "Estado", required: false, autoMatch: ["status", "estado", "published", "is published"] },
  { key: "Tipo", label: "Tipo (Simple/Variable)", required: false, autoMatch: ["type", "tipo"] },
  { key: "URL_Imagen", label: "Imágenes", required: false, autoMatch: ["images", "imagen", "url_imagen", "image"] },
  { key: "Codigo_Barras", label: "Cód. Barras", required: false, autoMatch: ["barcode", "codigo_barras", "ean"] },
  { key: "Referencia_Externa", label: "Ref. Externa", required: false, autoMatch: ["external_reference", "id"] }
]

export default function ImportClient() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Step State
  const [step, setStep] = useState<Step>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  
  // Raw Data State
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawData, setRawData] = useState<any[]>([])
  
  // Mapping State
  const [columnMap, setColumnMap] = useState<Record<string, string>>({})
  
  // Filtering State
  const [allRows, setAllRows] = useState<NormalizedRow[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [brandFilter, setBrandFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  // Backend preview
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const headers = ["Name", "Type", "SKU", "Regular price", "Stock", "Categories", "Status"]
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" +
      "Ejemplo Pulsera,simple,SKU-123,25000,50,Accesorios,publish\n"
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "plantilla_woocommerce.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) processFile(files[0])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0])
  }

  const processFile = (uploadedFile: File) => {
    if (uploadedFile.type !== "text/csv" && !uploadedFile.name.endsWith('.csv')) {
      alert("Por favor, sube únicamente archivos CSV.")
      return
    }
    setFile(uploadedFile)
    setIsProcessing(true)

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || []
        const data = results.data as any[]
        
        setRawHeaders(headers)
        setRawData(data)
        
        // Auto-guess mapping
        const initialMap: Record<string, string> = {}
        for (const kField of KORA_FIELDS) {
          const match = headers.find(h => kField.autoMatch.some(am => h.toLowerCase().includes(am)))
          if (match) {
            initialMap[kField.key] = match
          }
        }
        setColumnMap(initialMap)
        setIsProcessing(false)
        setStep('mapping')
      },
      error: (err) => {
        console.error(err)
        alert("Error de parseo del CSV: " + err.message)
        setIsProcessing(false)
      }
    })
  }

  const handleMapConfirmation = () => {
    // Validate required fields
    if (!columnMap["Producto"] || !columnMap["SKU"]) {
      alert("Debes mapear obligatoriamente 'Producto' y 'SKU'.")
      return
    }

    // Process data to NormalizedRow
    const normalized = rawData.map(raw => {
      const getVal = (koraKey: string) => {
        const csvKey = columnMap[koraKey]
        return csvKey ? (raw[csvKey] || "").toString().trim() : ""
      }

      const rawType = getVal("Tipo").toLowerCase()
      const rawCat = getVal("Categoria")
      let rawProduct = getVal("Producto")
      let rawVariant = getVal("Variante")
      
      // Auto-extract variant name from WooCommerce parent-child format
      if (rawType === "variation" && rawProduct.includes("-") && !rawVariant) {
        const parts = rawProduct.split("-")
        rawVariant = parts.pop()?.trim() || ""
        rawProduct = parts.join("-").trim()
      }

      // Status normalization
      const statusRaw = getVal("Estado").toLowerCase()
      let finalStatus = "Borrador"
      if (statusRaw === "publish" || statusRaw === "publicado" || statusRaw === "1" || statusRaw === "yes") finalStatus = "Publicado"
      else if (statusRaw === "private" || statusRaw === "archivado") finalStatus = "Archivado"

      // Razzi Demo Rule
      let isExcluded = false
      let excludeReason = ""
      const catLower = rawCat.toLowerCase()
      
      const razziKeywords = ["kids", "shoe", "women", "men", "fashion", "bag", "clothing", "hoodie", "t-shirt", "ropa", "zapato", "bolso", "moda"]
      
      if (razziKeywords.some(kw => catLower.includes(kw))) {
        isExcluded = true
        excludeReason = "Categoría Demo Razzi"
      }

      return {
        _original: raw,
        Producto: rawProduct,
        Variante: rawVariant,
        SKU: getVal("SKU"),
        Costo: getVal("Costo"),
        Precio: getVal("Precio"),
        Stock: getVal("Stock"),
        Codigo_Barras: getVal("Codigo_Barras"),
        Referencia_Externa: getVal("Referencia_Externa"),
        Marca: getVal("Marca"),
        Categoria: rawCat,
        Estado: finalStatus,
        Tipo: rawType || "simple",
        URL_Imagen: getVal("URL_Imagen"),
        Activo: finalStatus === "Publicado" ? "Si" : "No",
        _isExcluded: isExcluded,
        _excludeReason: excludeReason
      } as NormalizedRow
    })

    setAllRows(normalized)
    setStep('filtering')
  }

  // --- Filtering Logic ---

  const uniqueStatuses = useMemo(() => Array.from(new Set(allRows.map(r => r.Estado).filter(Boolean))), [allRows])
  const uniqueCategories = useMemo(() => Array.from(new Set(allRows.map(r => r.Categoria).filter(Boolean))), [allRows])
  const uniqueBrands = useMemo(() => Array.from(new Set(allRows.map(r => r.Marca).filter(Boolean))), [allRows])
  const uniqueTypes = useMemo(() => Array.from(new Set(allRows.map(r => r.Tipo).filter(Boolean))), [allRows])

  const processedRows = useMemo(() => {
    return allRows.map(row => {
      let isVisible = true
      if (search && !row.Producto.toLowerCase().includes(search.toLowerCase()) && !row.SKU.toLowerCase().includes(search.toLowerCase())) isVisible = false
      if (statusFilter !== "all" && row.Estado !== statusFilter) isVisible = false
      if (categoryFilter !== "all" && row.Categoria !== categoryFilter) isVisible = false
      if (brandFilter !== "all" && row.Marca !== brandFilter) isVisible = false
      if (typeFilter !== "all" && row.Tipo !== typeFilter) isVisible = false
      
      return { ...row, _isVisible: isVisible }
    })
  }, [allRows, search, statusFilter, categoryFilter, brandFilter, typeFilter])

  const { visibleRows, rowsToImport } = useMemo(() => {
    const visible = processedRows.filter(r => r._isVisible)
    const toImport = visible.filter(r => !r._isExcluded)
    return { visibleRows: visible, rowsToImport: toImport }
  }, [processedRows])
  
  const excludedCount = allRows.length - rowsToImport.length
  const detectedProducts = new Set(allRows.map(r => r.Producto).filter(Boolean)).size
  const importableProducts = new Set(rowsToImport.map(r => r.Producto).filter(Boolean)).size
  
  // Counters for missing SKUs (to help user diagnose)
  const missingSkuSimple = allRows.filter(r => !r.SKU.trim() && r.Tipo === "simple").length
  const missingSkuVar = allRows.filter(r => !r.SKU.trim() && r.Tipo === "variation").length
  const missingSkuRazzi = allRows.filter(r => !r.SKU.trim() && r._excludeReason === "Categoría Demo Razzi").length
  
  const totalRazzi = allRows.filter(r => r._excludeReason === "Categoría Demo Razzi").length
  
  const meridianKeywords = ["amatista", "turmalina", "cuarzo", "pirita", "chakra", "obsidiana", "japa", "collar", "pulsera", "tobillera"]
  const totalMeridian = allRows.filter(r => meridianKeywords.some(kw => r.Categoria.toLowerCase().includes(kw))).length


  useEffect(() => {
    if (step !== 'filtering' || allRows.length === 0 || rowsToImport.length === 0) {
      setPreview(null)
      return
    }
    const timer = setTimeout(() => {
      setIsProcessing(true)
      
      const csvData: CSVRow[] = rowsToImport.map(r => ({
        Producto: r.Producto,
        Variante: r.Variante,
        SKU: r.SKU,
        Costo: r.Costo,
        Precio: r.Precio,
        Stock: r.Stock,
        Codigo_Barras: r.Codigo_Barras,
        Referencia_Externa: r.Referencia_Externa,
        Marca: r.Marca,
        Categoria: r.Categoria,
        Estado: r.Estado,
        URL_Imagen: r.URL_Imagen,
        Activo: r.Activo
      }))

      console.log("DRY RUN START")
      processImportDryRun(csvData).then(res => {
        console.log("DRY RUN END")
        setPreview(res)
        setIsProcessing(false)
      }).catch(err => {
        console.error("DRY RUN ERROR", err)
        setIsProcessing(false)
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [rowsToImport, allRows.length, step])

  const applyQuickFilter = (type: string) => {
    setAllRows(prev => prev.map(r => {
      let exclude = r._isExcluded
      let reason = r._excludeReason

      if (type === "only_published") {
        if (r.Estado !== "Publicado") { exclude = true; reason = "No publicado" }
      } else if (type === "no_archived") {
        if (r.Estado === "Archivado") { exclude = true; reason = "Estado Archivado" }
      } else if (type === "no_razzi") {
        const cat = r.Categoria.toLowerCase()
        const razziKeywords = ["kids", "shoe", "women", "men", "fashion", "bag", "clothing", "hoodie", "t-shirt", "ropa", "zapato", "bolso", "moda"]
        if (razziKeywords.some(kw => cat.includes(kw))) {
          exclude = true; reason = "Filtro Demo Razzi"
        }
      } else if (type === "only_meridian") {
        const cat = r.Categoria.toLowerCase()
        const meridianKeywords = ["amatista", "turmalina", "cuarzo", "pirita", "chakra", "obsidiana", "japa", "collar", "pulsera", "tobillera"]
        if (!meridianKeywords.some(kw => cat.includes(kw))) { exclude = true; reason = "No es categoría Meridian" }
      }

      return { ...r, _isExcluded: exclude, _excludeReason: reason }
    }))
  }

  const toggleRowExclusion = (index: number) => {
    setAllRows(prev => {
      const copy = [...prev]
      const target = copy.find(r => r === visibleRows[index])
      if (target) {
        target._isExcluded = !target._isExcluded
        target._excludeReason = target._isExcluded ? "Exclusión Manual" : ""
      }
      return copy
    })
  }

  const handleConfirm = () => {
    if (!preview || preview.errors.length > 0 || rowsToImport.length === 0) return
    startTransition(async () => {
      try {
        const res = await executeImport(preview.parsedRows as CSVRow[])
        if (res.success) {
          setStep('success')
        } else {
          alert("Error en la importación: " + res.error)
        }
      } catch (e: any) {
        alert("Fallo inesperado: " + e.message)
      }
    })
  }

  const resetImport = () => {
    setStep('upload')
    setFile(null)
    setRawData([])
    setAllRows([])
    setColumnMap({})
    setPreview(null)
  }

  return (
    <div className="space-y-6">
      
      {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <Card className={`border-2 border-dashed ${isDragging ? 'border-primary bg-primary/5' : 'border-muted'} transition-colors`}>
          <CardContent 
            className="flex flex-col items-center justify-center py-16 text-center space-y-4"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="p-4 bg-muted rounded-full">
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Sube tu archivo de WooCommerce</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Acepta exportaciones directas de WooCommerce o plantillas estándar. Te ayudaremos a mapear las columnas a continuación.
              </p>
            </div>
            <div className="flex gap-4 mt-2">
              <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />
              <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Seleccionar Archivo
              </Button>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Descargar Plantilla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: MAPPING */}
      {step === 'mapping' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> Mapeo de Columnas
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Hemos detectado {rawHeaders.length} columnas en <strong>{file?.name}</strong>. Relaciona las columnas del CSV con los campos que KORA necesita.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {KORA_FIELDS.map(field => (
                <div key={field.key} className="space-y-1">
                  <label className="text-sm font-medium flex items-center justify-between">
                    {field.label}
                    {field.required && <span className="text-xs text-destructive">Obligatorio</span>}
                  </label>
                  <Select 
                    value={columnMap[field.key] || "unmapped"} 
                    onValueChange={(val) => setColumnMap(prev => ({...prev, [field.key]: val === "unmapped" ? "" : val}))}
                  >
                    <SelectTrigger className={columnMap[field.key] ? "border-primary/50" : ""}>
                      <SelectValue placeholder="Ignorar campo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unmapped">-- Ignorar / No existe --</SelectItem>
                      {rawHeaders.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Diagnóstico Breve */}
            <div className="bg-muted/30 p-4 rounded-md border mt-6">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" /> Vista Previa del Mapeo (Fila 1)
              </h4>
              {rawData.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div><strong>Producto:</strong> {rawData[0][columnMap["Producto"]] || "-"}</div>
                  <div><strong>SKU:</strong> {rawData[0][columnMap["SKU"]] || "-"}</div>
                  <div><strong>Precio:</strong> {rawData[0][columnMap["Precio"]] || "-"}</div>
                  <div><strong>Categoría:</strong> {rawData[0][columnMap["Categoria"]] || "-"}</div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">El archivo está vacío.</div>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button variant="outline" onClick={resetImport}>Cancelar</Button>
              <Button onClick={handleMapConfirmation}>
                Continuar a Filtros <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: FILTERING */}
      {step === 'filtering' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="bg-muted/30 border-b pb-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" /> Filtrado Inteligente
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Archivo: {file?.name} ({allRows.length} registros totales)
                  </p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-sm w-full sm:w-auto">
                  <div className="px-3 py-1 bg-muted/50 rounded-md">
                    <div className="font-bold text-lg">{detectedProducts}</div>
                    <div className="text-xs text-muted-foreground leading-none">Detectados</div>
                  </div>
                  <div className="px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md">
                    <div className="font-bold text-lg">{importableProducts}</div>
                    <div className="text-xs leading-none">A importar</div>
                  </div>
                  <div className="px-3 py-1 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-md">
                    <div className="font-bold text-lg">{totalMeridian}</div>
                    <div className="text-xs leading-none">Válidos Meridian</div>
                  </div>
                  <div className="px-3 py-1 bg-destructive/10 text-destructive rounded-md">
                    <div className="font-bold text-lg">{excludedCount}</div>
                    <div className="text-xs leading-none">Excluidos ({totalRazzi} Razzi)</div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              
              {/* Warnings de SKU Local */}
              <div className="flex gap-4 text-xs bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 p-2 rounded border border-amber-200 dark:border-amber-900">
                <strong>Análisis de SKU en las {allRows.length} filas totales:</strong>
                <span>{missingSkuSimple} simples sin SKU</span>
                <span>{missingSkuVar} variaciones sin SKU</span>
                <span>{missingSkuRazzi} de Razzi sin SKU</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-sm text-muted-foreground mr-2 self-center">Filtros Rápidos (Exclusión):</span>
                <Button variant="outline" size="sm" onClick={() => applyQuickFilter("only_published")}>Solo Publicados</Button>
                <Button variant="outline" size="sm" onClick={() => applyQuickFilter("no_archived")}>Excluir Archivados</Button>
                <Button variant="outline" size="sm" onClick={() => applyQuickFilter("no_razzi")}>Excluir Demo Razzi</Button>
                <Button variant="outline" size="sm" onClick={() => applyQuickFilter("only_meridian")}>Solo Meridian</Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar producto o SKU..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo Estado</SelectItem>
                    {uniqueStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo Tipo</SelectItem>
                    {uniqueTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toda Categoría</SelectItem>
                    {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <SelectValue placeholder="Marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toda Marca</SelectItem>
                    {uniqueBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
                
                <Button variant="ghost" onClick={() => {
                  setSearch("")
                  setStatusFilter("all")
                  setCategoryFilter("all")
                  setBrandFilter("all")
                  setTypeFilter("all")
                  setAllRows(prev => prev.map(r => ({ ...r, _isExcluded: false, _excludeReason: "" })))
                }}>Limpiar Todo</Button>
              </div>

              {/* Data Preview Table */}
              <div className="border rounded-md max-h-[300px] overflow-auto relative">
                {isProcessing && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[80px]">Importar</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU / Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Categoría</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Ningún producto coincide con los filtros.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleRows.slice(0, 100).map((r, i) => (
                        <TableRow key={i} className={r._isExcluded ? "opacity-50 bg-muted/30" : ""}>
                          <TableCell>
                            <Switch 
                              checked={!r._isExcluded} 
                              onCheckedChange={() => toggleRowExclusion(i)} 
                            />
                          </TableCell>
                          <TableCell className="font-medium text-xs">
                            {r.Producto}
                            {r.Variante && r.Variante !== "Única" && <span className="block text-muted-foreground">{r.Variante}</span>}
                            {r._isExcluded && <span className="block text-destructive mt-1">Excluido: {r._excludeReason}</span>}
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-xs">{r.SKU || "-"}</div>
                            <Badge variant="outline" className="text-[10px] mt-1 uppercase">{r.Tipo}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={r.Estado?.toLowerCase() === "publicado" ? "default" : "secondary"}>
                              {r.Estado || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{r.Categoria || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {visibleRows.length > 100 && (
                <div className="text-xs text-muted-foreground text-center mt-2">
                  Mostrando 100 de {visibleRows.length} filas visibles.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estadísticas del Backend */}
          {preview && !isProcessing && (
            <Card className="border-t-4 border-t-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Impacto Final en KORA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4 mb-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Se Crearán (Nuevos)</div>
                    <div className="text-2xl font-bold text-blue-600">{preview.newProducts} prod</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Se Actualizarán (Existentes)</div>
                    <div className="text-2xl font-bold">{preview.existingProducts} prod</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Variantes Nuevas</div>
                    <div className="text-2xl font-bold text-green-600">{preview.newVariants} var</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Variantes Actualizadas</div>
                    <div className="text-2xl font-bold text-amber-600">{preview.updatedVariants} var</div>
                  </div>
                </div>

                {preview.errors.length > 0 && (
                  <div className="mb-4 p-4 border border-destructive/50 bg-destructive/5 rounded-md">
                    <div className="flex items-center gap-2 text-destructive mb-2 font-semibold">
                      <AlertCircle className="h-4 w-4" />
                      Hay {preview.errors.length} errores en las filas seleccionadas que impedirán su importación.
                    </div>
                    <ul className="text-xs space-y-1 text-destructive/80 list-disc list-inside max-h-32 overflow-auto">
                      {preview.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep('mapping')} disabled={isPending}>
                    Atrás (Volver al Mapeo)
                  </Button>
                  <Button onClick={handleConfirm} disabled={isPending || preview.errors.length > 0 || rowsToImport.length === 0}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar e Importar {rowsToImport.length} registros
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* STEP 4: SUCCESS */}
      {step === 'success' && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <div>
              <h3 className="text-xl font-bold text-green-700 dark:text-green-500">¡Importación Exitosa!</h3>
              <p className="text-green-600 dark:text-green-400 mt-2">Los productos mapeados ya están en tu Catálogo.</p>
            </div>
            <div className="flex gap-4 mt-4">
              <Button onClick={() => router.push("/products")}>Ir al Catálogo</Button>
              <Button variant="outline" onClick={resetImport}>Importar otro archivo</Button>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
