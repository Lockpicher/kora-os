"use client"

import * as React from "react"
import { Plus, Edit, ToggleLeft, ToggleRight, Loader2 } from "lucide-react"
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
import { getBrands, createBrand, updateBrand, toggleBrandStatus } from "./actions"

interface Brand {
  id: string
  name: string
  slug: string
  active: boolean
  created_at: string
}

export default function BrandsPage() {
  const [brands, setBrands] = React.useState<Brand[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Estado del Modal
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedBrand, setSelectedBrand] = React.useState<Brand | null>(null)
  const [brandName, setBrandName] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState("")

  // Cargar marcas
  const loadBrands = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getBrands()
      setBrands(data as Brand[])
    } catch (error) {
      console.error("Error loading brands:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadBrands()
  }, [loadBrands])

  // Abrir modal para crear
  const handleCreateOpen = () => {
    setSelectedBrand(null)
    setBrandName("")
    setSubmitError("")
    setIsOpen(true)
  }

  // Abrir modal para editar
  const handleEditOpen = (brand: Brand) => {
    setSelectedBrand(brand)
    setBrandName(brand.name)
    setSubmitError("")
    setIsOpen(true)
  }

  // Guardar Marca (Crear / Editar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brandName.trim()) {
      setSubmitError("El nombre de la marca es obligatorio.")
      return
    }

    setIsSubmitting(true)
    setSubmitError("")

    try {
      if (selectedBrand) {
        // Editar
        await updateBrand(selectedBrand.id, brandName.trim())
      } else {
        // Crear
        await createBrand(brandName.trim())
      }
      setIsOpen(false)
      loadBrands()
    } catch (error) {
      const err = error as Error
      setSubmitError(err.message || "Ocurrió un error al guardar la marca.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cambiar estado activo/inactivo (Soft Delete)
  const handleToggleStatus = async (brand: Brand) => {
    try {
      await toggleBrandStatus(brand.id, brand.active)
      loadBrands()
    } catch (error) {
      console.error("Error changing brand status:", error)
    }
  }

  // Filtrar marcas
  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Marcas</h2>
          <p className="text-muted-foreground mt-1">
            Administra las marcas de productos de Grupo Kubbonet.
          </p>
        </div>
        <Button onClick={handleCreateOpen} className="gap-2">
          <Plus className="h-4 w-4" /> Agregar Marca
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Marcas</CardTitle>
          <CardDescription>
            Marcas registradas actualmente en el Catálogo Maestro.
          </CardDescription>
          <div className="mt-4">
            <Input
              placeholder="Buscar marca por nombre..."
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
          ) : filteredBrands.length === 0 ? (
            <div className="flex h-32 items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground">
              No se encontraron marcas.
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
                {filteredBrands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium text-foreground">{brand.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{brand.slug}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          brand.active
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}
                      >
                        {brand.active ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditOpen(brand)}
                          title="Editar Marca"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(brand)}
                          title={brand.active ? "Desactivar Marca" : "Activar Marca"}
                        >
                          {brand.active ? (
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
                {selectedBrand ? "Editar Marca" : "Nueva Marca"}
              </DialogTitle>
              <DialogDescription>
                Ingresa el nombre de la marca. El slug se generará automáticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Nombre de la Marca
                </label>
                <Input
                  id="name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Ej: Meridian, Overspray..."
                  className="bg-card border-border"
                  autoFocus
                />
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
