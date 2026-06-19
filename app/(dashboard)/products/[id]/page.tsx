"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getBrands } from "../../brands/actions"
import { getCategories } from "../../categories/actions"
import { getProductById, updateProduct } from "../actions"
import ProductImages from "@/components/products/product-images"

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [brands, setBrands] = React.useState<{ id: string; name: string }[]>([])
  const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState("")
  const [skuError, setSkuError] = React.useState(false)

  // Form states
  const [sku, setSku] = React.useState("")
  const [name, setName] = React.useState("")
  const [shortDesc, setShortDesc] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [brandId, setBrandId] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [cost, setCost] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [stock, setStock] = React.useState("")

  // Dimensions
  const [weight, setWeight] = React.useState("")
  const [length, setLength] = React.useState("")
  const [width, setWidth] = React.useState("")
  const [height, setHeight] = React.useState("")

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const [brandsData, categoriesData, productData] = await Promise.all([
          getBrands(),
          getCategories(),
          getProductById(productId),
        ])

        setBrands(brandsData.filter((b: { active: boolean }) => b.active))
        setCategories(categoriesData.filter((c: { active: boolean }) => c.active))

        if (productData) {
          setSku(productData.sku || "")
          setName(productData.name || "")
          setShortDesc(productData.short_description || "")
          setDescription(productData.description || "")
          setBrandId(productData.brand_id || "")
          setCategoryId(productData.category_id || "")
          setCost(productData.cost?.toString() || "0")
          setPrice(productData.price?.toString() || "0")
          setStock(productData.stock?.toString() || "0")

          if (productData.dimensions) {
            setWeight(productData.dimensions.weight?.toString() || "0")
            setLength(productData.dimensions.length?.toString() || "0")
            setWidth(productData.dimensions.width?.toString() || "0")
            setHeight(productData.dimensions.height?.toString() || "0")
          }
        } else {
          setErrorMsg("No se encontró el producto solicitado.")
        }
      } catch (e) {
        console.error("Error loading product data:", e)
        setErrorMsg("Ocurrió un error al cargar la información del producto.")
      } finally {
        setIsLoading(false)
      }
    }

    if (productId) {
      loadData()
    }
  }, [productId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sku.trim() || !name.trim() || !price || !stock) {
      setErrorMsg("SKU, Nombre, Precio y Stock son campos requeridos.")
      return
    }

    setIsSubmitting(true)
    setErrorMsg("")
    setSkuError(false)

    try {
      const productInput = {
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        short_description: shortDesc.trim(),
        description: description.trim(),
        brand_id: brandId || "",
        category_id: categoryId || "",
        cost: Number(cost) || 0,
        price: Number(price),
        stock: parseInt(stock, 10) || 0,
      }

      const dimensionsInput = {
        weight: Number(weight) || 0,
        length: Number(length) || 0,
        width: Number(width) || 0,
        height: Number(height) || 0,
      }

      const res = await updateProduct(productId, productInput, dimensionsInput)
      if (!res.success) {
        if (res.error === "duplicate_sku") {
          setErrorMsg("Ya existe un producto con el SKU ingresado. Utiliza un SKU diferente.")
          setSkuError(true)
        } else {
          setErrorMsg(res.error || "Error al actualizar el producto.")
        }
      } else {
        router.push("/products")
      }
    } catch (e) {
      const err = e as Error
      setErrorMsg(err.message || "Error al actualizar el producto. Verifica que el SKU sea único.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground text-sm">Cargando producto...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4">
        <Link href="/products" passHref legacyBehavior>
          <Button variant="outline" size="icon" title="Volver">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Editar Producto</h2>
          <p className="text-muted-foreground mt-1">
            Modifica la información general y dimensiones logísticas de tu producto.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Card 1: Información General */}
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>Datos descriptivos básicos del producto.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="sku" className="text-sm font-medium text-foreground">SKU *</label>
                  <Input
                    id="sku"
                    placeholder="Ej: MER-PUL-TUR-8"
                    value={sku}
                    onChange={(e) => {
                      setSku(e.target.value)
                      if (skuError) setSkuError(false)
                    }}
                    className={cn(
                      "bg-card border-border uppercase font-mono",
                      skuError && "border-destructive ring-2 ring-destructive/20 focus-visible:ring-destructive focus-visible:border-destructive"
                    )}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="name" className="text-sm font-medium text-foreground">Nombre del Producto *</label>
                  <Input
                    id="name"
                    placeholder="Ej: Pulsera Turmalina Negra 8mm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-card border-border"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="shortDesc" className="text-sm font-medium text-foreground">Descripción Corta</label>
                <Input
                  id="shortDesc"
                  placeholder="Resumen rápido para marketplaces..."
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  className="bg-card border-border"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="description" className="text-sm font-medium text-foreground">Descripción Completa</label>
                <textarea
                  id="description"
                  placeholder="Descripción detallada del producto..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground border-border"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="brand" className="text-sm font-medium text-foreground">Marca</label>
                  <select
                    id="brand"
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  >
                    <option value="">Selecciona una Marca</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="category" className="text-sm font-medium text-foreground">Categoría</label>
                  <select
                    id="category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  >
                    <option value="">Selecciona una Categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Precios e Inventario */}
          <Card>
            <CardHeader>
              <CardTitle>Valores e Inventario</CardTitle>
              <CardDescription>Costo, precio y stock maestro inicial.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="cost" className="text-sm font-medium text-foreground">Costo (COP)</label>
                <Input
                  id="cost"
                  type="number"
                  placeholder="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="bg-card border-border font-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="price" className="text-sm font-medium text-foreground">Precio de Venta (COP) *</label>
                <Input
                  id="price"
                  type="number"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-card border-border font-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="stock" className="text-sm font-medium text-foreground">Stock *</label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="bg-card border-border font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Datos Logísticos (Dimensiones) */}
          <Card>
            <CardHeader>
              <CardTitle>Dimensiones Logísticas</CardTitle>
              <CardDescription>Requerido para cálculo de envíos en Mercado Libre, WooCommerce, etc.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="weight" className="text-sm font-medium text-foreground">Peso (kg)</label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="bg-card border-border font-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="length" className="text-sm font-medium text-foreground">Largo (cm)</label>
                <Input
                  id="length"
                  type="number"
                  placeholder="0"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="bg-card border-border font-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="width" className="text-sm font-medium text-foreground">Ancho (cm)</label>
                <Input
                  id="width"
                  type="number"
                  placeholder="0"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="bg-card border-border font-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="height" className="text-sm font-medium text-foreground">Alto (cm)</label>
                <Input
                  id="height"
                  type="number"
                  placeholder="0"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="bg-card border-border font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {errorMsg && (
            <p className="text-sm text-destructive font-semibold bg-destructive/10 p-3 rounded-lg border border-destructive/20">{errorMsg}</p>
          )}

          {/* Acciones del formulario */}
          <div className="flex justify-end gap-4">
            <Link href="/products" passHref legacyBehavior>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Gestión de Imágenes del Producto (Fase 2A) */}
      <ProductImages productId={productId} />
    </div>
  )
}
