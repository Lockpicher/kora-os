"use client"

import * as React from "react"
import Link from "next/link"
import { Plus, Edit, ToggleLeft, ToggleRight, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getProducts, toggleProductStatus } from "./actions"
import { getBrands } from "../brands/actions"
import { getCategories } from "../categories/actions"

interface Product {
  id: string
  sku: string
  name: string
  slug: string
  brand_id: string | null
  category_id: string | null
  cost: number
  price: number
  stock: number
  active: boolean
  brands: { name: string } | null
  categories: { name: string } | null
}

export default function ProductsPage() {
  const [products, setProducts] = React.useState<Product[]>([])
  const [brands, setBrands] = React.useState<{ id: string; name: string }[]>([])
  const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Filtros
  const [search, setSearch] = React.useState("")
  const [selectedBrand, setSelectedBrand] = React.useState("all")
  const [selectedCategory, setSelectedCategory] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("active") // active, inactive, all

  const loadData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      // Cargar marcas y categorías para los selectores de filtros
      const [brandsData, categoriesData] = await Promise.all([
        getBrands(),
        getCategories(),
      ])
      setBrands(brandsData.filter((b: { active: boolean }) => b.active))
      setCategories(categoriesData.filter((c: { active: boolean }) => c.active))

      // Cargar productos
      const prods = await getProducts()
      setProducts(prods as unknown as Product[])
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Cambiar estado activo/inactivo (Soft Delete)
  const handleToggleStatus = async (product: Product) => {
    try {
      await toggleProductStatus(product.id, product.active)
      // Recargar lista
      const prods = await getProducts()
      setProducts(prods as unknown as Product[])
    } catch (error) {
      console.error("Error changing product status:", error)
    }
  }

  // Filtrado del lado del cliente para mayor velocidad e interactividad
  const filteredProducts = React.useMemo(() => {
    return products.filter((prod) => {
      // 1. Filtro por búsqueda de texto (nombre o SKU)
      const matchesSearch =
        prod.name.toLowerCase().includes(search.toLowerCase()) ||
        prod.sku.toLowerCase().includes(search.toLowerCase())

      // 2. Filtro por marca
      const matchesBrand =
        selectedBrand === "all" || prod.brand_id === selectedBrand

      // 3. Filtro por categoría
      const matchesCategory =
        selectedCategory === "all" || prod.category_id === selectedCategory

      // 4. Filtro por estado
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && prod.active) ||
        (statusFilter === "inactive" && !prod.active)

      return matchesSearch && matchesBrand && matchesCategory && matchesStatus
    })
  }, [products, search, selectedBrand, selectedCategory, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Productos</h2>
          <p className="text-muted-foreground mt-1">
            Administra el Catálogo Maestro centralizado para todos los canales.
          </p>
        </div>
        <Link href="/products/new" passHref legacyBehavior>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Agregar Producto
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Productos</CardTitle>
          <CardDescription>
            Búsqueda rápida y filtrado avanzado de productos.
          </CardDescription>

          {/* Panel de Filtros */}
          <div className="grid gap-4 md:grid-cols-4 mt-4">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por SKU o Nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card border-border text-sm"
              />
            </div>

            {/* Selector de Marcas */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            >
              <option value="all">Todas las Marcas</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Selector de Categorías */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            >
              <option value="all">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Selector de Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            >
              <option value="active">Solo Activos</option>
              <option value="inactive">Solo Inactivos</option>
              <option value="all">Todos los Estados</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-32 items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground">
              No se encontraron productos con los filtros seleccionados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="w-[100px]">Estado</TableHead>
                  <TableHead className="w-[100px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((prod) => (
                  <TableRow key={prod.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {prod.sku}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{prod.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {prod.brands?.name || "Sin marca"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {prod.categories?.name || "Sin categoría"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(prod.price).toLocaleString("es-CO", { minimumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {prod.stock}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          prod.active
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}
                      >
                        {prod.active ? "Activo" : "Inactivo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/products/${prod.id}`} passHref legacyBehavior>
                          <Button variant="ghost" size="icon" title="Editar Producto">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(prod)}
                          title={prod.active ? "Desactivar Producto" : "Activar Producto"}
                        >
                          {prod.active ? (
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
    </div>
  )
}
