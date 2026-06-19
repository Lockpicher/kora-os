"use client"

import * as React from "react"
import { Plus, Edit, ToggleLeft, ToggleRight, Loader2, Folder, CornerDownRight } from "lucide-react"
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
import { getCategories, createCategory, updateCategory, toggleCategoryStatus } from "./actions"

interface Category {
  id: string
  name: string
  slug: string
  parent_id: string | null
  active: boolean
  created_at: string
}

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<Category[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Estado del Modal
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null)
  const [categoryName, setCategoryName] = React.useState("")
  const [parentCategoryId, setParentCategoryId] = React.useState<string>("null")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState("")

  // Cargar categorías
  const loadCategories = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getCategories()
      setCategories(data as Category[])
    } catch (error) {
      console.error("Error loading categories:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadCategories()
  }, [loadCategories])

  // Abrir modal para crear
  const handleCreateOpen = () => {
    setSelectedCategory(null)
    setCategoryName("")
    setParentCategoryId("null")
    setSubmitError("")
    setIsOpen(true)
  }

  // Abrir modal para editar
  const handleEditOpen = (category: Category) => {
    setSelectedCategory(category)
    setCategoryName(category.name)
    setParentCategoryId(category.parent_id || "null")
    setSubmitError("")
    setIsOpen(true)
  }

  // Guardar Categoría (Crear / Editar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryName.trim()) {
      setSubmitError("El nombre de la categoría es obligatorio.")
      return
    }

    if (selectedCategory && parentCategoryId === selectedCategory.id) {
      setSubmitError("Una categoría no puede ser su propio padre.")
      return
    }

    setIsSubmitting(true)
    setSubmitError("")

    try {
      if (selectedCategory) {
        // Editar
        await updateCategory(
          selectedCategory.id,
          categoryName.trim(),
          parentCategoryId === "null" ? null : parentCategoryId
        )
      } else {
        // Crear
        await createCategory(
          categoryName.trim(),
          parentCategoryId === "null" ? null : parentCategoryId
        )
      }
      setIsOpen(false)
      loadCategories()
    } catch (error) {
      const err = error as Error
      setSubmitError(err.message || "Ocurrió un error al guardar la categoría.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cambiar estado activo/inactivo (Soft Delete)
  const handleToggleStatus = async (category: Category) => {
    try {
      await toggleCategoryStatus(category.id, category.active)
      loadCategories()
    } catch (error) {
      console.error("Error changing category status:", error)
    }
  }

  // Construir visualización indentada para el listado jerárquico
  // 1. Encontrar raíces (parent_id es null)
  // 2. Recursivamente agregar hijos
  const getHierarchicalList = React.useMemo(() => {
    const list: { category: Category; depth: number }[] = []

    const processChildren = (parentId: string | null, depth: number) => {
      const children = categories.filter((c) => c.parent_id === parentId)
      children.forEach((child) => {
        list.push({ category: child, depth })
        processChildren(child.id, depth + 1)
      })
    }

    processChildren(null, 0)

    // Si hay categorías huérfanas (cuyo parent_id no existe en la lista), las agregamos al final
    const addedIds = list.map((item) => item.category.id)
    const orphans = categories.filter((c) => c.parent_id !== null && !addedIds.includes(c.id))
    orphans.forEach((orphan) => {
      list.push({ category: orphan, depth: 0 })
    })

    return list
  }, [categories])

  // Filtrar la lista jerárquica
  const filteredList = getHierarchicalList.filter((item) =>
    item.category.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Lista de posibles categorías padres (excluyendo la seleccionada para evitar auto-referencias)
  const possibleParents = categories.filter(
    (c) => !selectedCategory || c.id !== selectedCategory.id
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Categorías</h2>
          <p className="text-muted-foreground mt-1">
            Administra las categorías de productos y sus niveles jerárquicos.
          </p>
        </div>
        <Button onClick={handleCreateOpen} className="gap-2">
          <Plus className="h-4 w-4" /> Agregar Categoría
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Categorías</CardTitle>
          <CardDescription>
            Visualización jerárquica de la taxonomía del catálogo.
          </CardDescription>
          <div className="mt-4">
            <Input
              placeholder="Buscar categoría por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm bg-card border-border"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredList.length === 0 ? (
            <div className="flex h-32 items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground">
              No se encontraron categorías.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="w-[120px]">Estado</TableHead>
                  <TableHead className="w-[120px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.map(({ category, depth }) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center">
                        {/* Indentación visual */}
                        {depth > 0 && (
                          <div
                            className="flex shrink-0 items-center justify-end text-muted-foreground mr-1"
                            style={{ width: `${depth * 24}px` }}
                          >
                            <CornerDownRight className="h-4 w-4 mr-1 opacity-70" />
                          </div>
                        )}
                        <Folder className="h-4 w-4 mr-2 text-violet-500 shrink-0" />
                        <span>{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {category.slug}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          category.active
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}
                      >
                        {category.active ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditOpen(category)}
                          title="Editar Categoría"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(category)}
                          title={category.active ? "Desactivar Categoría" : "Activar Categoría"}
                        >
                          {category.active ? (
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

      {/* Modal Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {selectedCategory ? "Editar Categoría" : "Nueva Categoría"}
              </DialogTitle>
              <DialogDescription>
                Crea una categoría y asígnale un nivel jerárquico opcional.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Nombre de la Categoría
                </label>
                <Input
                  id="name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ej: Joyería, Detailing, Velas..."
                  className="bg-card border-border"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="parent" className="text-sm font-medium text-foreground">
                  Categoría Padre (Opcional)
                </label>
                <select
                  id="parent"
                  value={parentCategoryId}
                  onChange={(e) => setParentCategoryId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                >
                  <option value="null">Ninguna (Categoría Raíz)</option>
                  {possibleParents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {submitError && (
                <p className="text-sm text-destructive font-medium">{submitError}</p>
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
