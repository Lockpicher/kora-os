"use client"

import * as React from "react"
import { Plus, Edit, ToggleLeft, ToggleRight, Loader2, Sliders, Trash2 } from "lucide-react"
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
import { getCategories } from "../categories/actions"
import {
  getAttributeDefinitions,
  createAttributeDefinition,
  updateAttributeDefinition,
  toggleAttributeDefinitionStatus,
  getAttributeOptions,
  AttributeDefinition
} from "./actions"

interface Category {
  id: string
  name: string
  active: boolean
}

export default function AttributesPage() {
  const [attributes, setAttributes] = React.useState<(AttributeDefinition & { categories: { name: string } | null })[]>([])
  const [categories, setCategories] = React.useState<Category[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState("all")

  // Modal State
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedAttribute, setSelectedAttribute] = React.useState<AttributeDefinition | null>(null)
  const [attrName, setAttrName] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [dataType, setDataType] = React.useState<"text" | "textarea" | "number" | "boolean" | "select">("text")
  const [isRequired, setIsRequired] = React.useState(false)
  const [sortOrder, setSortOrder] = React.useState("0")
  const [options, setOptions] = React.useState<string[]>([])
  
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState("")

  // Load categories and attributes
  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const [catsData, attrsRes] = await Promise.all([
        getCategories(),
        getAttributeDefinitions()
      ])
      setCategories(catsData.filter((c: { active: boolean }) => c.active) as Category[])
      if (attrsRes.success && attrsRes.attributes) {
        setAttributes(attrsRes.attributes)
      } else {
        console.error("Error loading attributes:", attrsRes.error)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Open modal for creation
  const handleCreateOpen = () => {
    setSelectedAttribute(null)
    setAttrName("")
    setCategoryId(categories[0]?.id || "")
    setDataType("text")
    setIsRequired(false)
    setSortOrder("0")
    setOptions([""])
    setSubmitError("")
    setIsOpen(true)
  }

  // Open modal for editing
  const handleEditOpen = async (attr: AttributeDefinition) => {
    setSelectedAttribute(attr)
    setAttrName(attr.name)
    setCategoryId(attr.category_id)
    setDataType(attr.data_type)
    setIsRequired(attr.required)
    setSortOrder(attr.sort_order.toString())
    setSubmitError("")
    
    if (attr.data_type === "select") {
      try {
        const res = await getAttributeOptions(attr.id)
        if (res.success && res.options) {
          setOptions(res.options.map(opt => opt.value))
        } else {
          setOptions([""])
        }
      } catch (e) {
        console.error("Error loading attribute options:", e)
        setOptions([""])
      }
    } else {
      setOptions([""])
    }
    
    setIsOpen(true)
  }

  // Manage option fields
  const handleAddOption = () => {
    setOptions([...options, ""])
  }

  const handleRemoveOption = (index: number) => {
    const updated = options.filter((_, idx) => idx !== index)
    setOptions(updated.length === 0 ? [""] : updated)
  }

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options]
    updated[index] = val
    setOptions(updated)
  }

  // Save Attribute
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!attrName.trim()) {
      setSubmitError("El nombre del atributo es obligatorio.")
      return
    }
    if (!categoryId) {
      setSubmitError("Debes seleccionar una categoría.")
      return
    }

    // Validation for select options
    let filteredOptions: string[] = []
    if (dataType === "select") {
      filteredOptions = options.map(opt => opt.trim()).filter(Boolean)
      if (filteredOptions.length === 0) {
        setSubmitError("Un atributo de tipo Selección debe tener al menos una opción.")
        return
      }
    }

    setIsSubmitting(true)
    setSubmitError("")

    try {
      const input = {
        category_id: categoryId,
        name: attrName.trim(),
        data_type: dataType,
        required: isRequired,
        sort_order: parseInt(sortOrder, 10) || 0
      }

      let res
      if (selectedAttribute) {
        res = await updateAttributeDefinition(selectedAttribute.id, input, filteredOptions)
      } else {
        res = await createAttributeDefinition(input, filteredOptions)
      }

      if (res.success) {
        setIsOpen(false)
        loadData()
      } else {
        setSubmitError(res.error || "Error al guardar el atributo.")
      }
    } catch (error) {
      const err = error as Error
      setSubmitError(err.message || "Ocurrió un error inesperado al guardar el atributo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle active status
  const handleToggleStatus = async (attr: AttributeDefinition) => {
    try {
      const res = await toggleAttributeDefinitionStatus(attr.id, attr.active)
      if (res.success) {
        loadData()
      } else {
        console.error("Error toggling status:", res.error)
      }
    } catch (error) {
      console.error("Error changing status:", error)
    }
  }

  // Filter attributes list
  const filteredAttributes = React.useMemo(() => {
    return attributes.filter((attr) => {
      const matchesSearch = attr.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = categoryFilter === "all" || attr.category_id === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [attributes, searchQuery, categoryFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Atributos</h2>
          <p className="text-muted-foreground mt-1">
            Gestiona los atributos dinámicos configurados para cada categoría de producto.
          </p>
        </div>
        <Button onClick={handleCreateOpen} className="gap-2">
          <Plus className="h-4 w-4" /> Agregar Atributo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Atributos</CardTitle>
          <CardDescription>
            Definición de campos específicos según la clasificación de tus productos.
          </CardDescription>

          {/* Filters Panel */}
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <Input
              placeholder="Buscar atributo por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-card border-border text-sm"
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            >
              <option value="all">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAttributes.length === 0 ? (
            <div className="flex h-32 items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground">
              No se encontraron atributos configurados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Tipo de Dato</TableHead>
                  <TableHead>Requerido</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead className="w-[120px]">Estado</TableHead>
                  <TableHead className="w-[120px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttributes.map((attr) => (
                  <TableRow key={attr.id}>
                    <TableCell className="font-medium text-foreground flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-violet-500 shrink-0" />
                      <span>{attr.name}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {attr.categories?.name || "Sin categoría"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono uppercase">
                      {attr.data_type}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {attr.required ? "Sí" : "No"}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {attr.sort_order}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          attr.active
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}
                      >
                        {attr.active ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditOpen(attr)}
                          title="Editar Atributo"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(attr)}
                          title={attr.active ? "Desactivar Atributo" : "Activar Atributo"}
                        >
                          {attr.active ? (
                            <ToggleLeft className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <ToggleRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {selectedAttribute ? "Editar Atributo" : "Nuevo Atributo"}
              </DialogTitle>
              <DialogDescription>
                Crea atributos dinámicos que se solicitarán automáticamente al crear un producto en esta categoría.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Category */}
              <div className="flex flex-col gap-2">
                <label htmlFor="category" className="text-sm font-medium text-foreground">
                  Categoría *
                </label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Nombre del Atributo *
                </label>
                <Input
                  id="name"
                  value={attrName}
                  onChange={(e) => setAttrName(e.target.value)}
                  placeholder="Ej: Piedra, Aroma, Largo de Cadena..."
                  className="bg-card border-border"
                />
              </div>

              {/* Data Type */}
              <div className="flex flex-col gap-2">
                <label htmlFor="dataType" className="text-sm font-medium text-foreground">
                  Tipo de Campo *
                </label>
                <select
                  id="dataType"
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value as "text" | "textarea" | "number" | "boolean" | "select")}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                >
                  <option value="text">Texto Corto (Input)</option>
                  <option value="textarea">Texto Largo (Textarea)</option>
                  <option value="number">Numérico (Input Number)</option>
                  <option value="boolean">Boleano / Sí-No (Switch)</option>
                  <option value="select">Selección Múltiple (Select)</option>
                </select>
              </div>

              {/* Options list for SELECT type */}
              {dataType === "select" && (
                <div className="flex flex-col gap-2 border border-border p-3 rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground">Opciones del Desplegable *</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddOption}
                      className="h-7 text-xs px-2"
                    >
                      + Añadir Opción
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {options.map((opt, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder={`Opción ${index + 1}`}
                          value={opt}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          className="h-8 text-sm bg-card border-border"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOption(index)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required & Order */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="required" className="text-sm font-medium text-foreground">
                    ¿Es Obligatorio?
                  </label>
                  <div className="flex h-9 items-center">
                    <input
                      type="checkbox"
                      id="required"
                      checked={isRequired}
                      onChange={(e) => setIsRequired(e.target.checked)}
                      className="h-4 w-4 accent-primary rounded border-border"
                    />
                    <label htmlFor="required" className="text-sm ml-2 text-muted-foreground">
                      Requerido
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="sortOrder" className="text-sm font-medium text-foreground">
                    Orden de Visualización
                  </label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    placeholder="0"
                    className="bg-card border-border font-mono text-sm"
                  />
                </div>
              </div>

              {submitError && (
                <p className="text-sm text-destructive font-semibold bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">{submitError}</p>
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
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
