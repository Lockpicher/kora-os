"use client"

import * as React from "react"
import { Layers, Plus, Edit, ToggleLeft, ToggleRight, Loader2, AlertCircle, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getProductVariants,
  createVariant,
  updateVariant,
  toggleVariantStatus,
  getVariantAttributes,
  VariantInput,
  getInventoryMovementTypes,
  getInventoryMovements,
  createInventoryMovement,
  InventoryMovementType,
  InventoryMovementRecord,
  InventoryMovementInput
} from "@/app/(dashboard)/products/actions"
import {
  getAttributeDefinitionsByCategory,
  getAttributeOptions,
  AttributeDefinition
} from "@/app/(dashboard)/attributes/actions"

interface ProductVariantsProps {
  productId: string
  categoryId: string
  productName: string
  parentSku: string
}

interface ProductVariant {
  id: string
  sku: string
  name: string
  price: number
  cost: number
  stock: number
  active: boolean
  barcode?: string
  external_reference?: string
}

export default function ProductVariants({
  productId,
  categoryId,
  productName,
  parentSku
}: ProductVariantsProps) {
  const [variants, setVariants] = React.useState<ProductVariant[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState("")
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null)

  // Dialog State
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedVariant, setSelectedVariant] = React.useState<ProductVariant | null>(null)
  const [sku, setSku] = React.useState("")
  const [name, setName] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [cost, setCost] = React.useState("")
  const [stock, setStock] = React.useState("")
  const [barcode, setBarcode] = React.useState("")
  const [externalReference, setExternalReference] = React.useState("")

  // Dynamic Attributes State
  const [attrDefinitions, setAttrDefinitions] = React.useState<AttributeDefinition[]>([])
  const [attrOptions, setAttrOptions] = React.useState<{ [key: string]: string[] }>({})
  const [attrValues, setAttrValues] = React.useState<{ [key: string]: string }>({})
  const [isLoadingAttrs, setIsLoadingAttrs] = React.useState(false)

  // Auto-generation tracking
  const [lastAutoSku, setLastAutoSku] = React.useState("")
  const [lastAutoName, setLastAutoName] = React.useState("")

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState("")

  // Inventory Management State
  const [isInvOpen, setIsInvOpen] = React.useState(false)
  const [invVariant, setInvVariant] = React.useState<ProductVariant | null>(null)
  const [movements, setMovements] = React.useState<InventoryMovementRecord[]>([])
  const [movementTypes, setMovementTypes] = React.useState<InventoryMovementType[]>([])
  const [isLoadingInv, setIsLoadingInv] = React.useState(false)
  
  const [invType, setInvType] = React.useState("")
  const [invQty, setInvQty] = React.useState("")
  const [invRef, setInvRef] = React.useState("")
  const [invNotes, setInvNotes] = React.useState("")
  const [invSubmitting, setInvSubmitting] = React.useState(false)
  const [invError, setInvError] = React.useState("")

  // Load Inventory Movement Types
  React.useEffect(() => {
    async function loadTypes() {
      const res = await getInventoryMovementTypes()
      if (res.success && res.types) setMovementTypes(res.types)
    }
    loadTypes()
  }, [])

  // Load variants from database
  const loadVariants = React.useCallback(async () => {
    setIsLoading(true)
    setErrorMsg("")
    try {
      const res = await getProductVariants(productId)
      if (res.success && res.variants) {
        setVariants(res.variants as ProductVariant[])
      } else {
        setErrorMsg(res.error || "Error al cargar las variantes del producto.")
      }
    } catch (e) {
      console.error("Error loading variants:", e)
      setErrorMsg("Ocurrió un error inesperado al recuperar las variantes.")
    } finally {
      setIsLoading(false)
    }
  }, [productId])

  React.useEffect(() => {
    if (productId) {
      loadVariants()
    }
  }, [productId, loadVariants])

  // Load Category attribute definitions & option lists
  const loadAttributesAndOptions = React.useCallback(async () => {
    if (!categoryId) return
    setIsLoadingAttrs(true)
    try {
      const res = await getAttributeDefinitionsByCategory(categoryId)
      if (res.success && res.attributes) {
        setAttrDefinitions(res.attributes)

        const selectAttrs = res.attributes.filter(a => a.data_type === "select")
        const optionsObj: { [key: string]: string[] } = {}

        await Promise.all(
          selectAttrs.map(async (attr) => {
            const optRes = await getAttributeOptions(attr.id)
            if (optRes.success && optRes.options) {
              optionsObj[attr.id] = optRes.options.map(o => o.value)
            } else {
              optionsObj[attr.id] = []
            }
          })
        )
        setAttrOptions(optionsObj)
      } else {
        setAttrDefinitions([])
      }
    } catch (e) {
      console.error("Error loading variant category attributes:", e)
    } finally {
      setIsLoadingAttrs(false)
    }
  }, [categoryId])

  React.useEffect(() => {
    loadAttributesAndOptions()
  }, [loadAttributesAndOptions])

  // SKU & Name Auto-suggestion Effect
  React.useEffect(() => {
    if (!isOpen || attrDefinitions.length === 0) return

    const sortedDefs = [...attrDefinitions].sort((a, b) => a.sort_order - b.sort_order)
    const selectedVals = sortedDefs
      .map(def => {
        const val = attrValues[def.id] || ""
        if (def.data_type === "boolean") {
          return val === "true" ? def.name : ""
        }
        return val
      })
      .filter(Boolean)

    // Generate dynamic suggestions
    const suggestedName = selectedVals.length > 0
      ? `${productName} - ${selectedVals.join(" - ")}`
      : productName

    const suffix = selectedVals
      .map(val => {
        let cleaned = val.replace(/\s+/g, "").toUpperCase()
        cleaned = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        cleaned = cleaned.replace(/[^A-Z0-9]/g, "")
        if (cleaned.length > 4) {
          return cleaned.substring(0, 3)
        }
        return cleaned
      })
      .filter(Boolean)
      .join("-")
    const suggestedSku = suffix ? `${parentSku}-${suffix}` : parentSku

    // Auto-update inputs if they are empty or match the last autogenerated values
    if (!sku.trim() || sku === parentSku || sku === lastAutoSku) {
      setSku(suggestedSku)
      setLastAutoSku(suggestedSku)
    }

    if (!name.trim() || name === productName || name === lastAutoName) {
      setName(suggestedName)
      setLastAutoName(suggestedName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attrValues, attrDefinitions, productName, parentSku, isOpen])

  // Open modal to create variant
  const handleCreateOpen = () => {
    setSelectedVariant(null)
    setSku(parentSku)
    setName(productName)
    setCost("")
    setPrice("")
    setStock("0")
    setBarcode("")
    setExternalReference("")
    setLastAutoSku(parentSku)
    setLastAutoName(productName)

    const initialValues: { [key: string]: string } = {}
    attrDefinitions.forEach(attr => {
      initialValues[attr.id] = attr.data_type === "boolean" ? "false" : ""
    })
    setAttrValues(initialValues)
    setSubmitError("")
    setIsOpen(true)
  }

  // Open modal to edit variant
  const handleEditOpen = async (variant: ProductVariant) => {
    setSelectedVariant(variant)
    setSku(variant.sku)
    setName(variant.name)
    setCost(variant.cost?.toString() || "")
    setPrice(variant.price?.toString() || "")
    setStock(variant.stock?.toString() || "0")
    setBarcode(variant.barcode || "")
    setExternalReference(variant.external_reference || "")
    setLastAutoSku("")
    setLastAutoName("")
    setSubmitError("")

    // Load saved variant attributes
    try {
      const res = await getVariantAttributes(variant.id)
      const existingVals = res.success && res.values ? res.values : []

      const mappedValues: { [key: string]: string } = {}
      attrDefinitions.forEach(attr => {
        const match = existingVals.find(ev => ev.attribute_definition_id === attr.id)
        if (match) {
          mappedValues[attr.id] = match.value_text
        } else {
          mappedValues[attr.id] = attr.data_type === "boolean" ? "false" : ""
        }
      })
      setAttrValues(mappedValues)
    } catch (e) {
      console.error("Error loading variant saved values:", e)
    }

    setIsOpen(true)
  }

  // Toggle active/inactive state (Soft Delete)
  const handleToggleStatus = async (variant: ProductVariant) => {
    setActionLoadingId(variant.id)
    try {
      const res = await toggleVariantStatus(variant.id, variant.active)
      if (res.success) {
        loadVariants()
      } else {
        setErrorMsg(res.error || "Error al cambiar el estado de la variante.")
      }
    } catch (e) {
      console.error("Error toggling variant active status:", e)
      setErrorMsg("Ocurrió un error inesperado al cambiar el estado.")
    } finally {
      setActionLoadingId(null)
    }
  }

  // Handle Form Submission (Save/Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sku.trim() || !name.trim() || !price || !stock) {
      setSubmitError("SKU, Nombre, Precio y Stock son requeridos.")
      return
    }

    // Validate dynamic required attributes
    for (const attr of attrDefinitions) {
      if (attr.required) {
        const val = attrValues[attr.id]
        if (!val || val.trim() === "") {
          setSubmitError(`El atributo "${attr.name}" es obligatorio.`)
          return
        }
      }
    }

    setIsSubmitting(true)
    setSubmitError("")

    try {
      const attributeValuesArray = attrDefinitions.map(attr => ({
        attribute_definition_id: attr.id,
        value_text: attrValues[attr.id] || (attr.data_type === "boolean" ? "false" : "")
      }))

      const payload: VariantInput = {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        price: Number(price),
        cost: Number(cost) || 0,
        stock: parseInt(stock, 10) || 0,
        barcode: barcode.trim() || undefined,
        external_reference: externalReference.trim() || undefined,
        attributeValues: attributeValuesArray
      }

      let res
      if (selectedVariant) {
        res = await updateVariant(selectedVariant.id, payload)
      } else {
        res = await createVariant(productId, payload)
      }

      if (res.success) {
        setIsOpen(false)
        loadVariants()
      } else {
        if (res.error === "duplicate_sku") {
          setSubmitError("Ya existe una variante con el SKU ingresado. Utiliza un SKU diferente.")
        } else {
          setSubmitError(res.error || "Ocurrió un error al guardar la variante.")
        }
      }
    } catch (e) {
      console.error("Error submitting variant form:", e)
      setSubmitError("Error de red o servidor. Inténtalo de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open Inventory Management Modal
  const handleInventoryOpen = async (variant: ProductVariant) => {
    setInvVariant(variant)
    setMovements([])
    setInvType("")
    setInvQty("")
    setInvRef("")
    setInvNotes("")
    setInvError("")
    setIsLoadingInv(true)
    setIsInvOpen(true)

    try {
      const res = await getInventoryMovements(variant.id)
      if (res.success && res.movements) {
        setMovements(res.movements)
      }
    } catch (e) {
      console.error("Error loading movements:", e)
    } finally {
      setIsLoadingInv(false)
    }
  }

  // Submit New Inventory Movement
  const handleInvSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invVariant || !invType || !invQty) return

    const qty = parseInt(invQty, 10)
    if (isNaN(qty) || qty === 0) {
      setInvError("La cantidad debe ser un número distinto de cero.")
      return
    }

    setInvSubmitting(true)
    setInvError("")

    try {
      const payload: InventoryMovementInput = {
        variant_id: invVariant.id,
        movement_type_id: invType,
        quantity: qty,
        reference: invRef.trim(),
        notes: invNotes.trim()
      }

      const res = await createInventoryMovement(payload)
      
      if (res.success) {
        // Recargar historial y listado general de variantes
        setInvQty("")
        setInvRef("")
        setInvNotes("")
        setInvType("")
        loadVariants()
        handleInventoryOpen(invVariant) // Refresca el modal actual
      } else {
        setInvError(res.error || "Ocurrió un error al registrar el movimiento.")
      }
    } catch (e) {
      console.error("Error creating movement:", e)
      setInvError("Error de red o servidor. Inténtalo de nuevo.")
    } finally {
      setInvSubmitting(false)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle>Variantes del Producto</CardTitle>
          <CardDescription>
            Administra las combinaciones comerciales de este producto (tallas, materiales, etc.) con sus propios SKU, stock, código de barras y referencia externa.
          </CardDescription>
        </div>
        <Button
          type="button"
          onClick={handleCreateOpen}
          disabled={isLoading || isLoadingAttrs}
          className="gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" /> Crear Variante
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Cargando variantes...</span>
          </div>
        ) : variants.length === 0 ? (
          <div
            onClick={handleCreateOpen}
            className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-8 cursor-pointer text-muted-foreground text-center"
          >
            <Layers className="h-10 w-10 mb-2 text-muted-foreground/60" />
            <p className="font-semibold text-sm">No hay variantes creadas para este producto</p>
            <p className="text-xs text-muted-foreground/75 mt-1">Haz clic aquí para crear tu primera variante comercial</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[120px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((v) => {
                  const isItemLoading = actionLoadingId === v.id
                  return (
                    <TableRow key={v.id} className={!v.active ? "opacity-70 bg-muted/10" : ""}>
                      <TableCell className="font-mono text-xs font-semibold text-foreground">
                        {v.sku}
                      </TableCell>
                      <TableCell className="text-foreground text-sm font-medium">
                        {v.name}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-foreground">
                        ${v.price?.toLocaleString()} COP
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        ${v.cost?.toLocaleString()} COP
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-foreground">
                        {v.stock}
                      </TableCell>
                      <TableCell>
                        {v.active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-500 border border-slate-500/20">
                            Inactiva
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isItemLoading}
                            onClick={() => handleEditOpen(v)}
                            title="Editar Variante"
                            className="h-8 w-8 text-foreground"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isItemLoading}
                            onClick={() => handleToggleStatus(v)}
                            title={v.active ? "Desactivar Variante" : "Activar Variante"}
                            className="h-8 w-8"
                          >
                            {isItemLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : v.active ? (
                              <ToggleLeft className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <ToggleRight className="h-5 w-5 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isItemLoading}
                            onClick={() => handleInventoryOpen(v)}
                            title="Gestión de Inventario"
                            className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Dialog para Crear/Editar Variante */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {selectedVariant ? "Editar Variante" : "Nueva Variante"}
              </DialogTitle>
              <DialogDescription>
                Ingresa los datos comerciales y de inventario de la variante, y sus especificaciones de atributos.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Atributos Dinámicos de Variante (Renderizados Primero para Gatillar SKU/Nombre) */}
              {attrDefinitions.length > 0 && (
                <div className="border border-border p-3 rounded-lg bg-muted/10 space-y-3">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Atributos de Variante</h4>
                  
                  {isLoadingAttrs ? (
                    <div className="flex h-10 items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {attrDefinitions.map((attr) => {
                        const val = attrValues[attr.id] || ""
                        return (
                          <div key={attr.id} className="flex flex-col gap-1.5">
                            <label htmlFor={`var-attr-${attr.id}`} className="text-xs font-medium text-foreground">
                              {attr.name} {attr.required && "*"}
                            </label>

                            {attr.data_type === "text" && (
                              <Input
                                id={`var-attr-${attr.id}`}
                                value={val}
                                onChange={(e) => setAttrValues({ ...attrValues, [attr.id]: e.target.value })}
                                required={attr.required}
                                placeholder={attr.name}
                                className="h-8 text-xs bg-card border-border"
                              />
                            )}

                            {attr.data_type === "textarea" && (
                              <textarea
                                id={`var-attr-${attr.id}`}
                                value={val}
                                onChange={(e) => setAttrValues({ ...attrValues, [attr.id]: e.target.value })}
                                required={attr.required}
                                placeholder={attr.name}
                                rows={2}
                                className="flex w-full rounded-md border border-input bg-card px-2.5 py-1.5 text-xs shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground border-border"
                              />
                            )}

                            {attr.data_type === "number" && (
                              <Input
                                id={`var-attr-${attr.id}`}
                                type="number"
                                value={val}
                                onChange={(e) => setAttrValues({ ...attrValues, [attr.id]: e.target.value })}
                                required={attr.required}
                                placeholder="0"
                                className="h-8 text-xs bg-card border-border font-mono"
                              />
                            )}

                            {attr.data_type === "boolean" && (
                              <div className="flex h-8 items-center">
                                <input
                                  type="checkbox"
                                  id={`var-attr-${attr.id}`}
                                  checked={val === "true"}
                                  onChange={(e) => setAttrValues({ ...attrValues, [attr.id]: e.target.checked ? "true" : "false" })}
                                  className="h-3.5 w-3.5 accent-primary rounded border-border"
                                />
                                <span className="text-xs ml-1.5 text-muted-foreground">Habilitado</span>
                              </div>
                            )}

                            {attr.data_type === "select" && (
                              <select
                                id={`var-attr-${attr.id}`}
                                value={val}
                                onChange={(e) => setAttrValues({ ...attrValues, [attr.id]: e.target.value })}
                                required={attr.required}
                                className="flex h-8 w-full rounded-md border border-input bg-card px-2 py-1 text-xs shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                              >
                                <option value="">Seleccionar...</option>
                                {(attrOptions[attr.id] || []).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SKU */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sku" className="text-xs font-semibold text-foreground">SKU *</label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Ej: MER-PUL-AMA-8MM-ACE"
                  className="h-9 text-sm bg-card border-border font-mono uppercase"
                />
              </div>

              {/* Nombre */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-xs font-semibold text-foreground">Nombre *</label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Pulsera Amatista - 8 mm - Acero"
                  className="h-9 text-sm bg-card border-border"
                />
              </div>

              {/* Precios e Inventario */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="price" className="text-xs font-semibold text-foreground">Precio COP *</label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="h-9 text-sm bg-card border-border font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cost" className="text-xs font-semibold text-foreground">Costo COP</label>
                  <Input
                    id="cost"
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0"
                    className="h-9 text-sm bg-card border-border font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="stock" className="text-xs font-semibold text-foreground">Stock *</label>
                  <Input
                    id="stock"
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="0"
                    className="h-9 text-sm bg-card border-border font-mono"
                  />
                </div>
              </div>

              {/* Barcode & External Reference */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="barcode" className="text-xs font-semibold text-foreground">Código de Barras</label>
                  <Input
                    id="barcode"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="EAN13, UPC..."
                    className="h-9 text-sm bg-card border-border font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="externalReference" className="text-xs font-semibold text-foreground">Referencia Externa</label>
                  <Input
                    id="externalReference"
                    value={externalReference}
                    onChange={(e) => setExternalReference(e.target.value)}
                    placeholder="MLA1234567..."
                    className="h-9 text-sm bg-card border-border font-mono"
                  />
                </div>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="font-semibold">{submitError}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  "Guardar Variante"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Gestión de Inventario */}
      <Dialog open={isInvOpen} onOpenChange={setIsInvOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4 shrink-0 border-b border-border">
            <DialogTitle>Inventario: {invVariant?.name}</DialogTitle>
            <DialogDescription>
              SKU: {invVariant?.sku} | Stock Actual: <span className="font-mono text-foreground font-bold">{invVariant?.stock}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6 py-4 overflow-y-auto">
            {/* Nuevo Movimiento */}
            <div className="bg-muted/10 p-4 rounded-xl border border-border">
              <h4 className="text-sm font-semibold mb-4 text-foreground">Registrar Movimiento</h4>
              
              <form onSubmit={handleInvSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Tipo de Movimiento *</label>
                    <select
                      value={invType}
                      onChange={(e) => setInvType(e.target.value)}
                      required
                      className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    >
                      <option value="">Seleccionar...</option>
                      {movementTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.operation})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Cantidad *</label>
                    <Input
                      type="number"
                      value={invQty}
                      onChange={(e) => setInvQty(e.target.value)}
                      required
                      placeholder="Ej: 5"
                      className="h-9 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Referencia (Opcional)</label>
                    <Input
                      value={invRef}
                      onChange={(e) => setInvRef(e.target.value)}
                      placeholder="Ej: FAC-1234, Devolución #98..."
                      className="h-9 font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Notas (Opcional)</label>
                    <Input
                      value={invNotes}
                      onChange={(e) => setInvNotes(e.target.value)}
                      placeholder="Detalles adicionales..."
                      className="h-9"
                    />
                  </div>
                </div>

                {invError && (
                  <div className="flex items-center gap-2 p-2.5 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20 mt-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p className="font-semibold">{invError}</p>
                  </div>
                )}

                <Button type="submit" disabled={invSubmitting} className="w-full">
                  {invSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Registrar Movimiento
                </Button>
              </form>
            </div>

            {/* Historial */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-foreground">Historial de Movimientos</h4>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Saldos (Ant → Act)</TableHead>
                      <TableHead>Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingInv ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No hay movimientos registrados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      movements.map((m) => {
                        const isPos = m.inventory_movement_types?.operation === "IN" || (m.inventory_movement_types?.operation === "ADJUST" && m.quantity > 0)
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                              {new Date(m.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-foreground">
                              {m.inventory_movement_types?.name}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {m.reference || "-"}
                            </TableCell>
                            <TableCell className={`text-right font-mono text-xs font-bold ${isPos ? "text-emerald-500" : "text-rose-500"}`}>
                              {isPos ? "+" : ""}{m.inventory_movement_types?.operation === "OUT" ? -Math.abs(m.quantity) : m.quantity}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                              {m.stock_before} <span className="text-border">→</span> <span className="text-foreground font-semibold">{m.stock_after}</span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground truncate max-w-[100px]">
                              {m.created_by || "Sistema"}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
