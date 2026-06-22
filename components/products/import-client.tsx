/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useRef, useTransition, useMemo, useEffect } from "react"
import { UploadCloud, CheckCircle2, AlertCircle, Download, Loader2, Filter, Search } from "lucide-react"
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
}

export default function ImportClient() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  
  const [allRows, setAllRows] = useState<NormalizedRow[]>([])
  
  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [brandFilter, setBrandFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Extract unique values for filters
  const uniqueStatuses = useMemo(() => Array.from(new Set(allRows.map(r => r.Estado).filter(Boolean))), [allRows])
  const uniqueCategories = useMemo(() => Array.from(new Set(allRows.map(r => r.Categoria).filter(Boolean))), [allRows])
  const uniqueBrands = useMemo(() => Array.from(new Set(allRows.map(r => r.Marca).filter(Boolean))), [allRows])
  const uniqueTypes = useMemo(() => Array.from(new Set(allRows.map(r => r.Tipo).filter(Boolean))), [allRows])

  // Apply filters
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
  const variationsCount = rowsToImport.filter(r => r.Tipo === "variation").length

  // Recalculate backend dry-run when rowsToImport changes
  useEffect(() => {
    if (allRows.length === 0 || rowsToImport.length === 0) {
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
  }, [rowsToImport, allRows.length])

  const downloadTemplate = () => {
    const headers = ["Name", "Type", "SKU", "Regular price", "Stock", "Categories", "Published", "Status"]
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" +
      "Ejemplo Pulsera,simple,SKU-123,25000,50,Accesorios,1,publish\n" +
      "Producto Razzi,simple,SKU-DEMO,0,0,Ropa,0,draft"
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
    setPreview(null)
    setIsSuccess(false)

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawData = results.data as any[]
        const normalized = rawData.map(raw => {
          const cat = (raw.Categoria || raw.Categories || "").trim()
          const catLower = cat.toLowerCase()
          const type = (raw.Tipo || raw.Type || "simple").toLowerCase().trim()
          
          let estado = "Borrador"
          if (raw.Estado) {
            estado = raw.Estado
          } else if (raw.Status !== undefined) {
            if (raw.Status === "publish") estado = "Publicado"
            else if (raw.Status === "draft") estado = "Borrador"
            else if (raw.Status === "private") estado = "Archivado"
          } else if (raw.Published !== undefined) {
            estado = (raw.Published === "1" || raw.Published?.toLowerCase() === "yes") ? "Publicado" : "Borrador"
          }

          let isExcluded = false
          let excludeReason = ""
          
          if (catLower.includes("ropa") || catLower.includes("zapato") || catLower.includes("bolso") || catLower.includes("moda")) {
            isExcluded = true
            excludeReason = "Categoría Demo Razzi"
          }

          let productName = raw.Producto || raw.Name || ""
          let variantName = raw.Variante || ""

          // In WooCommerce, variation names often look like "Parent Name - Variant"
          if (type === "variation" && productName.includes("-") && !variantName) {
            const parts = productName.split("-")
            variantName = parts.pop()?.trim() || ""
            productName = parts.join("-").trim()
          }

          return {
            _original: raw,
            Producto: productName,
            Variante: variantName,
            SKU: raw.SKU || raw.sku || "",
            Costo: raw.Costo || "",
            Precio: raw["Regular price"] || raw.Sale_price || raw.Precio || "0",
            Stock: raw.Stock || raw.stock || "0",
            Codigo_Barras: raw.Codigo_Barras || "",
            Referencia_Externa: raw.Referencia_Externa || "",
            Marca: raw.Marca || raw.Brand || "",
            Categoria: cat,
            Estado: estado,
            Tipo: type,
            URL_Imagen: raw.URL_Imagen || raw.Images || "",
            Activo: estado === "Publicado" ? "Si" : "No",
            _isExcluded: isExcluded,
            _excludeReason: excludeReason
          } as NormalizedRow
        })
        
        setAllRows(normalized)
      },
      error: (err) => {
        console.error(err)
        alert("Error de parseo del CSV: " + err.message)
        setIsProcessing(false)
      }
    })
  }

  const applyQuickFilter = (type: string) => {
    setAllRows(prev => prev.map(r => {
      let exclude = r._isExcluded
      let reason = r._excludeReason

      if (type === "only_published") {
        if (r.Estado !== "Publicado") {
          exclude = true
          reason = "No publicado"
        }
      } else if (type === "no_archived") {
        if (r.Estado === "Archivado") {
          exclude = true
          reason = "Estado Archivado"
        }
      } else if (type === "no_razzi") {
        const cat = r.Categoria.toLowerCase()
        if (cat.includes("ropa") || cat.includes("zapato") || cat.includes("bolso") || cat.includes("moda")) {
          exclude = true
          reason = "Filtro Demo Razzi"
        }
      } else if (type === "only_meridian") {
        if (r.Marca && r.Marca.toLowerCase() !== "meridian") {
          exclude = true
          reason = "No es Meridian"
        }
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
          setIsSuccess(true)
          setPreview(null)
          setFile(null)
          setAllRows([])
        } else {
          alert("Error en la importación: " + res.error)
        }
      } catch (e: any) {
        alert("Fallo inesperado: " + e.message)
      }
    })
  }

  return (
    <div className="space-y-6">
      {!isSuccess && allRows.length === 0 && (
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
                Acepta exportaciones directas de WooCommerce o plantillas estándar. El sistema normalizará las columnas automáticamente.
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

      {isSuccess && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <div>
              <h3 className="text-xl font-bold text-green-700 dark:text-green-500">¡Importación Exitosa!</h3>
              <p className="text-green-600 dark:text-green-400 mt-2">Los productos mapeados ya están en tu Catálogo.</p>
            </div>
            <div className="flex gap-4 mt-4">
              <Button onClick={() => router.push("/products")}>Ir al Catálogo</Button>
              <Button variant="outline" onClick={() => { setIsSuccess(false); setFile(null); setAllRows([]) }}>Importar más</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {allRows.length > 0 && !isSuccess && (
        <div className="space-y-6">
          {/* Mapeo y Filtrado UI */}
          <Card>
            <CardHeader className="bg-muted/30 border-b pb-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" /> Mapeo y Filtrado Inteligente
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
                    <div className="font-bold text-lg">{variationsCount}</div>
                    <div className="text-xs leading-none">Variaciones</div>
                  </div>
                  <div className="px-3 py-1 bg-destructive/10 text-destructive rounded-md">
                    <div className="font-bold text-lg">{excludedCount}</div>
                    <div className="text-xs leading-none">Excluidos</div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
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
                <CardTitle className="text-md">Impacto Final en KORA (Solo filas seleccionadas)</CardTitle>
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
                  <Button variant="outline" onClick={() => { setAllRows([]); setFile(null) }} disabled={isPending}>
                    Cancelar y subir otro archivo
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
    </div>
  )
}
