"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { getBrands } from "../../brands/actions"
import { getCategories } from "../../categories/actions"
import { createProduct } from "../actions"
import { getAttributeDefinitionsByCategory, getAttributeOptions, AttributeDefinition } from "../../attributes/actions"

export default function NewProductPage() {
  const router = useRouter()
  const [brands, setBrands] = React.useState<{ id: string; name: string }[]>([])
  const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([])
  const [isLoadingSelects, setIsLoadingSelects] = React.useState(true)
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

  // Dynamic attributes
  const [attrDefinitions, setAttrDefinitions] = React.useState<AttributeDefinition[]>([])
  const [attrOptions, setAttrOptions] = React.useState<{ [key: string]: string[] }>({})
  const [attrValues, setAttrValues] = React.useState<{ [key: string]: string }>({})
  const [isLoadingAttrs, setIsLoadingAttrs] = React.useState(false)

  React.useEffect(() => {
    async function loadCategoryAttributes() {
      if (!categoryId) {
        setAttrDefinitions([])
        setAttrOptions({})
        setAttrValues({})
        return
      }

      setIsLoadingAttrs(true)
      try {
        const res = await getAttributeDefinitionsByCategory(categoryId)
        if (res.success && res.attributes) {
          setAttrDefinitions(res.attributes)

          // Fetch options for select attributes
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

          // Initialize values
          const initialValues: { [key: string]: string } = {}
          res.attributes.forEach(attr => {
            if (attr.data_type === "boolean") {
              initialValues[attr.id] = "false"
            } else {
              initialValues[attr.id] = ""
            }
          })
          setAttrValues(initialValues)
        } else {
          setAttrDefinitions([])
        }
      } catch (e) {
        console.error("Error loading category attributes:", e)
      } finally {
        setIsLoadingAttrs(false)
      }
    }

    loadCategoryAttributes()
  }, [categoryId])

  React.useEffect(() => {
    async function loadSelects() {
      setIsLoadingSelects(true)
      try {
        const [brandsData, categoriesData] = await Promise.all([
          getBrands(),
          getCategories(),
        ])
        setBrands(brandsData.filter((b: { active: boolean }) => b.active))
        setCategories(categoriesData.filter((c: { active: boolean }) => c.active))
      } catch (e) {
        console.error("Error loading dropdown data:", e)
      } finally {
        setIsLoadingSelects(false)
      }
    }
    loadSelects()
  }, [])

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

      const attributeValuesArray = attrDefinitions.map(attr => ({
        attribute_definition_id: attr.id,
        value_text: attrValues[attr.id] || (attr.data_type === "boolean" ? "false" : "")
      }))

      const res = await createProduct(productInput, dimensionsInput, attributeValuesArray)
      if (!res.success) {
        if (res.error === "duplicate_sku") {
          setErrorMsg("Ya existe un producto con el SKU ingresado. Utiliza un SKU diferente.")
          setSkuError(true)
        } else {
          setErrorMsg(res.error || "Error al crear el producto.")
        }
      } else {
        router.push("/products")
      }
    } catch (e) {
      const err = e as Error
      setErrorMsg(err.message || "Error al crear el producto. Verifica que el SKU sea único.")
    } finally {
      setIsSubmitting(false)
    }
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
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Crear Producto</h2>
          <p className="text-muted-foreground mt-1">
            Registra un producto en el Catálogo Maestro y sus dimensiones logísticas.
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
                    disabled={isLoadingSelects}
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
                    disabled={isLoadingSelects}
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

          {/* Card 1.5: Atributos Dinámicos de la Categoría */}
          {categoryId && attrDefinitions.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Atributos de la Categoría</CardTitle>
                <CardDescription>
                  Especificaciones personalizadas para los productos clasificados bajo esta categoría.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {isLoadingAttrs ? (
                  <div className="flex h-16 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Cargando atributos...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {attrDefinitions.map((attr) => {
                      const value = attrValues[attr.id] || ""
                      
                      return (
                        <div key={attr.id} className="flex flex-col gap-2">
                          <label htmlFor={`attr-${attr.id}`} className="text-sm font-medium text-foreground">
                            {attr.name} {attr.required && "*"}
                          </label>
                          
                          {attr.data_type === "text" && (
                            <Input
                              id={`attr-${attr.id}`}
                              value={value}
                              onChange={(e) => setAttrValues({ ...attrValues, [attr.id]: e.target.value })}
                              required={attr.required}
                              placeholder={`Ingresa ${attr.name.toLowerCase()}...`}
                              className="bg-card border-border"
                            />
                          )}

                          {attr.data_type === "textarea" && (
                            <textarea
                              id={`attr-${attr.id}`}
                              value={value}
                              onChange={(e) => setAttrValues({ ...attrValues, [attr.id]: e.target.value })}
                              required={attr.required}
                              placeholder={`Ingresa ${attr.name.toLowerCase()}...`}
                              rows={3}
                              className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground border-border"
                            />
                          )}

                          {attr.data_type === "number" && (
                            <Input
                              id={`attr-${attr.id}`}
                              type="number"
                              value={value}
                              onChange={(e) => setAttrValues({ ...attrValues, [attr.id]: e.target.value })}
                              required={attr.required}
                              placeholder="0"
                              className="bg-card border-border font-mono"
                            />
                          )}

                          {attr.data_type === "boolean" && (
                            <div className="flex h-9 items-center">
                              <input
                                type="checkbox"
                                id={`attr-${attr.id}`}
                                checked={value === "true"}
                                onChange={(e) => setAttrValues({ ...attrValues, [attr.id]: e.target.checked ? "true" : "false" })}
                                className="h-4 w-4 accent-primary rounded border-border"
                              />
                              <label htmlFor={`attr-${attr.id}`} className="text-sm ml-2 text-muted-foreground">
                                Habilitado / Sí
                              </label>
                            </div>
                          )}

                          {attr.data_type === "select" && (
                            <select
                              id={`attr-${attr.id}`}
                              value={value}
                              onChange={(e) => setAttrValues({ ...attrValues, [attr.id]: e.target.value })}
                              required={attr.required}
                              className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                            >
                              <option value="">Selecciona...</option>
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
              </CardContent>
            </Card>
          )}

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
                <label htmlFor="stock" className="text-sm font-medium text-foreground">Stock Inicial *</label>
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
                "Guardar Producto"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
