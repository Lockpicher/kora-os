import { createClient } from "@/lib/supabase/server"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { DollarSign, ShoppingCart, Tag, Calculator, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Mercado Libre Analytics | KORA OS",
}

export const dynamic = "force-dynamic"

export default async function MercadoLibreAnalyticsPage() {
  const supabase = await createClient()

  // 1. Métricas agregadas (in-memory grouping since postgrest JS client lacks complex group by)
  const { data: orders } = await supabase.from("ml_orders").select("total_amount")
  const { data: itemsMetrics } = await supabase.from("ml_item_metrics").select("id").eq("status", "active")
  const { data: orderItems } = await supabase.from("ml_order_items").select("item_id, title, quantity, unit_price, variant_id")

  const totalOrders = orders?.length || 0
  const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const activeItemsCount = itemsMetrics?.length || 0

  // 2. Agrupación por producto (Order Items)
  const productStats = new Map<string, { title: string, qty: number, rev: number, variantId: string | null }>()
  
  if (orderItems) {
    for (const item of orderItems) {
      const existing = productStats.get(item.item_id) || { title: item.title, qty: 0, rev: 0, variantId: item.variant_id }
      existing.qty += Number(item.quantity)
      existing.rev += (Number(item.quantity) * Number(item.unit_price))
      // Sometimes title changes slightly, keep the latest one
      existing.title = item.title
      productStats.set(item.item_id, existing)
    }
  }

  const allProducts = Array.from(productStats.entries()).map(([id, stats]) => ({
    id,
    ...stats
  }))

  const topByUnits = [...allProducts].sort((a, b) => b.qty - a.qty).slice(0, 20)
  const topByRevenue = [...allProducts].sort((a, b) => b.rev - a.rev).slice(0, 20)
  const unlinkedProducts = allProducts.filter(p => !p.variantId).sort((a, b) => b.qty - a.qty)

  const formatCurrency = (val: number) => "$" + val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/integrations/mercadolibre">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Mercado Libre Analytics
          </h2>
          <p className="text-muted-foreground mt-2">
            Inteligencia comercial histórica basada en tus ventas y publicaciones.
          </p>
        </div>
      </div>

      {/* Widgets Mínimos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas Históricas</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <div className="text-xs text-muted-foreground mt-1">Ingresos totales capturados</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos (90d)</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">Total de transacciones</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Publicaciones Activas</CardTitle>
            <Tag className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeItemsCount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">En ml_item_metrics</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Promedio</CardTitle>
            <Calculator className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgTicket)}</div>
            <div className="text-xs text-muted-foreground mt-1">Por orden de compra</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Tabla 1: Top 20 por unidades */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Top 20 Productos (Unidades)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Unds Vendidas</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topByUnits.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center">No hay datos suficientes</TableCell></TableRow>
                )}
                {topByUnits.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium text-sm line-clamp-1" title={p.title}>{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.id}</div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-500">{p.qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.rev)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tabla 2: Top 20 por ingresos */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Top 20 Productos (Ingresos)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Unds Vendidas</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topByRevenue.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center">No hay datos suficientes</TableCell></TableRow>
                )}
                {topByRevenue.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium text-sm line-clamp-1" title={p.title}>{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.id}</div>
                    </TableCell>
                    <TableCell className="text-right">{p.qty}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-500">{formatCurrency(p.rev)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tabla 3: Sin conciliación (Huérfanos que han vendido) */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-rose-500">Alerta: Vendidos pero no vinculados a KORA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID ML</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Total Vendido</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unlinkedProducts.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-emerald-500 font-medium">¡Todo perfecto! No tienes ventas de productos sin vincular.</TableCell></TableRow>
                  )}
                  {unlinkedProducts.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.id}</TableCell>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell className="text-right">{p.qty} unds</TableCell>
                      <TableCell className="text-right">
                        <Button variant="link" size="sm" asChild className="text-amber-500 p-0">
                          <Link href={`/products?search=${encodeURIComponent(p.title)}`}>Buscar Variante</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
