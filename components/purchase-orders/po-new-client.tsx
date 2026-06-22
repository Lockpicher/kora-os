"use client"

import * as React from "react"
import { ArrowLeft, Trash2, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Supplier } from "@/app/(dashboard)/suppliers/actions"
import { createPurchaseOrder } from "@/app/(dashboard)/purchase-orders/actions"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Variant {
  id: string
  sku: string
  name: string
  current_cost: number | null
  products: { id: string; name: string } | null
}

interface CartItem {
  id: string // temporary internal id
  variant_id: string
  variant_name: string
  sku: string
  quantity: number
  unit_cost: number
  total_cost: number
}

export default function PurchaseOrderNewClient({ 
  suppliers, 
  variants 
}: { 
  suppliers: Supplier[]; 
  variants: Variant[] 
}) {
  const router = useRouter()
  const [supplierId, setSupplierId] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [cart, setCart] = React.useState<CartItem[]>([])

  // Buscador de Variante
  const [searchVariant, setSearchVariant] = React.useState("")
  const [filteredVariants, setFilteredVariants] = React.useState<Variant[]>([])

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState("")

  // Subtotales
  const subtotal = cart.reduce((acc, item) => acc + item.total_cost, 0)
  const total = subtotal // Puedes agregar lógica de impuestos después

  React.useEffect(() => {
    if (searchVariant.trim().length > 1) {
      const lower = searchVariant.toLowerCase()
      setFilteredVariants(variants.filter(v => 
        (v.sku && v.sku.toLowerCase().includes(lower)) || 
        (v.name && v.name.toLowerCase().includes(lower)) ||
        (v.products?.name && v.products.name.toLowerCase().includes(lower))
      ).slice(0, 5))
    } else {
      setFilteredVariants([])
    }
  }, [searchVariant, variants])

  const handleAddVariant = (v: Variant) => {
    const exists = cart.find(item => item.variant_id === v.id)
    if (exists) {
      setCart(cart.map(item => {
        if (item.variant_id === v.id) {
          const newQty = item.quantity + 1
          return { ...item, quantity: newQty, total_cost: newQty * item.unit_cost }
        }
        return item
      }))
    } else {
      const unitCost = v.current_cost || 0
      setCart([...cart, {
        id: Math.random().toString(36).substring(7),
        variant_id: v.id,
        variant_name: v.products?.name ? `${v.products.name} - ${v.name}` : v.name,
        sku: v.sku,
        quantity: 1,
        unit_cost: unitCost,
        total_cost: unitCost
      }])
    }
    setSearchVariant("")
    setFilteredVariants([])
  }

  const handleUpdateItem = (id: string, field: 'quantity' | 'unit_cost', value: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        updated.total_cost = updated.quantity * updated.unit_cost
        return updated
      }
      return item
    }))
  }

  const handleRemoveItem = (id: string) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId) {
      setErrorMsg("Debes seleccionar un proveedor.")
      return
    }
    if (cart.length === 0) {
      setErrorMsg("Debes agregar al menos un producto a la orden.")
      return
    }

    setIsSubmitting(true)
    setErrorMsg("")

    const res = await createPurchaseOrder({
      supplier_id: supplierId,
      subtotal,
      total,
      notes,
      items: cart.map(item => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost
      }))
    })

    if (res.success && res.orderId) {
      router.push(`/purchase-orders/${res.orderId}`)
    } else {
      setErrorMsg(res.error || "Ocurrió un error al crear la orden.")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-6xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/purchase-orders">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Crear Orden de Compra</h2>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Productos de la Orden</CardTitle>
              <CardDescription>Busca y añade los productos que vas a comprar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input 
                  placeholder="Buscar por SKU o nombre..." 
                  value={searchVariant}
                  onChange={(e) => setSearchVariant(e.target.value)}
                />
                {filteredVariants.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-card border border-border rounded-md shadow-lg overflow-hidden">
                    {filteredVariants.map(v => (
                      <div 
                        key={v.id} 
                        className="px-4 py-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                        onClick={() => handleAddVariant(v)}
                      >
                        <div>
                          <p className="font-medium text-foreground">{v.products?.name} {v.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{v.sku || "Sin SKU"}</p>
                        </div>
                        <Button type="button" size="sm" variant="secondary">Añadir</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="w-[100px]">Cant.</TableHead>
                        <TableHead className="w-[120px]">Costo Unit.</TableHead>
                        <TableHead className="w-[120px] text-right">Subtotal</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <p className="font-medium text-foreground">{item.variant_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              min="1" 
                              value={item.quantity || ""} 
                              onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                              className="w-full text-center px-1"
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.01"
                              value={item.unit_cost || ""} 
                              onChange={(e) => handleUpdateItem(item.id, 'unit_cost', Number(e.target.value))}
                              className="w-full text-right px-1"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${item.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Detalles de Orden</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Proveedor</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  required
                >
                  <option value="" disabled>Seleccionar proveedor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Notas Internas</label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instrucciones, referencias de facturas..."
                />
              </div>

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {errorMsg && <p className="text-sm text-destructive font-medium">{errorMsg}</p>}

              <Button type="submit" className="w-full gap-2 mt-4" disabled={isSubmitting || cart.length === 0}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar como Borrador
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
