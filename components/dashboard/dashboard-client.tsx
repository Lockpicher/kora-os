"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { DollarSign, ShoppingCart, Tag, Calculator, Percent, TrendingUp, AlertTriangle, AlertCircle, ShoppingBag, PackageX } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export interface MLTopProduct {
  id: string
  sku: string
  name: string
  qty: number
  revenue: number
  profit: number
  margin: number
  stock: number
}

export interface MLRotationProduct {
  id: string
  name: string
  stock: number
  qty: number
  coverage: number | "> 90 días" | "N/A"
}

export interface MLOpportunity {
  id: string
  name: string
  visits: number
  sales: number
  stock: number
  conversion: number
  type: "CRÍTICO" | "ATENCIÓN" | "OPORTUNIDAD"
}

export interface MLDashboardData {
  // Comerciales
  sales_30d: number
  orders_30d: number
  avg_ticket: number
  active_listings: number
  units_sold: number
  products_sold: number
  global_conversion: number
  potential_roas: string

  // Rentabilidad
  reconciled_revenue: number
  cogs: number
  gross_profit: number
  gross_margin: number
  orphan_revenue: number // Ingresos excluidos

  // Tops
  top_by_units: MLTopProduct[]
  top_by_revenue: MLTopProduct[]
  top_by_profit: MLTopProduct[]

  // Rotación y Críticos
  top_rotation: MLRotationProduct[]
  critical_stock: MLRotationProduct[]
  
  // Oportunidades
  opportunities: MLOpportunity[]

  // WooCommerce Legacy
  wc_orders_today: number
  wc_sales_today: number
  wc_sync_errors: number
}

export default function DashboardClient({ data }: { data: MLDashboardData }) {
  const formatCur = (val: number) => "$" + val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const formatNum = (val: number) => val.toLocaleString("en-US")

  return (
    <div className="space-y-8">
      
      {/* 1. KPIs Comerciales */}
      <div>
        <h3 className="text-xl font-semibold mb-4 text-primary flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Métricas Comerciales (Mercado Libre)
        </h3>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card className="bg-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs text-muted-foreground">Ventas ML</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatCur(data.sales_30d)}</div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs text-muted-foreground">Pedidos ML</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatNum(data.orders_30d)}</div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs text-muted-foreground">Ticket Promedio</CardTitle>
              <Calculator className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatCur(data.avg_ticket)}</div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs text-muted-foreground">Publicaciones Activas</CardTitle>
              <Tag className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatNum(data.active_listings)}</div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs text-muted-foreground">Conversión Global</CardTitle>
              <Percent className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{data.global_conversion.toFixed(2)}%</div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs text-muted-foreground">ROAS Potencial</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{data.potential_roas}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 2. KPIs Rentabilidad */}
      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-emerald-400 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Rentabilidad Bruta (Items Conciliados)
          </h3>
          {data.orphan_revenue > 0 && (
             <span className="text-xs font-medium text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                Ingresos excluidos por falta de conciliación: {formatCur(data.orphan_revenue)}
             </span>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1">
             <p className="text-sm text-muted-foreground">Ingresos Conciliados</p>
             <p className="text-2xl font-bold text-white">{formatCur(data.reconciled_revenue)}</p>
          </div>
          <div className="space-y-1">
             <p className="text-sm text-muted-foreground">Costo de Ventas (COGS)</p>
             <p className="text-2xl font-bold text-rose-400">{formatCur(data.cogs)}</p>
          </div>
          <div className="space-y-1 border-l border-slate-700 pl-4">
             <p className="text-sm text-muted-foreground">Utilidad Bruta</p>
             <p className="text-3xl font-bold text-emerald-500">{formatCur(data.gross_profit)}</p>
          </div>
          <div className="space-y-1">
             <p className="text-sm text-muted-foreground">Margen Bruto</p>
             <p className="text-3xl font-bold text-emerald-400">{data.gross_margin.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* 3. Top Productos */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
             <CardTitle className="text-sm">Top 20 por Unidades</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
               <TableHeader>
                  <TableRow>
                     <TableHead>Producto</TableHead>
                     <TableHead className="text-right">Unds</TableHead>
                     <TableHead className="text-right">Utilidad</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {data.top_by_units.slice(0,10).map(p => (
                     <TableRow key={p.id}>
                        <TableCell className="text-xs font-medium max-w-[120px] truncate" title={p.name}>{p.name}</TableCell>
                        <TableCell className="text-right font-bold text-blue-500">{formatNum(p.qty)}</TableCell>
                        <TableCell className="text-right text-xs">{formatCur(p.profit)}</TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle className="text-sm">Top 20 por Ingresos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
               <TableHeader>
                  <TableRow>
                     <TableHead>Producto</TableHead>
                     <TableHead className="text-right">Ingresos</TableHead>
                     <TableHead className="text-right">Margen</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {data.top_by_revenue.slice(0,10).map(p => (
                     <TableRow key={p.id}>
                        <TableCell className="text-xs font-medium max-w-[120px] truncate" title={p.name}>{p.name}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-500">{formatCur(p.revenue)}</TableCell>
                        <TableCell className="text-right text-xs">{p.margin.toFixed(1)}%</TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle className="text-sm">Top 20 por Utilidad</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
               <TableHeader>
                  <TableRow>
                     <TableHead>Producto</TableHead>
                     <TableHead className="text-right">Utilidad</TableHead>
                     <TableHead className="text-right">Margen</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {data.top_by_profit.slice(0,10).map(p => (
                     <TableRow key={p.id}>
                        <TableCell className="text-xs font-medium max-w-[120px] truncate" title={p.name}>{p.name}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-400">{formatCur(p.profit)}</TableCell>
                        <TableCell className="text-right text-xs">{p.margin.toFixed(1)}%</TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 4. Rotación y Críticos */}
      <div className="grid gap-6 lg:grid-cols-2">
         <Card>
            <CardHeader>
               <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Mayor Rotación
               </CardTitle>
            </CardHeader>
            <CardContent>
               <Table>
                  <TableHeader>
                     <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Ventas</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Cobertura</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {data.top_rotation.slice(0,10).map(p => (
                        <TableRow key={p.id}>
                           <TableCell className="text-xs font-medium max-w-[150px] truncate">{p.name}</TableCell>
                           <TableCell className="text-right">{p.qty}</TableCell>
                           <TableCell className="text-right font-mono">{p.stock}</TableCell>
                           <TableCell className="text-right text-xs font-medium">
                              {typeof p.coverage === 'number' ? `${p.coverage} días` : p.coverage}
                           </TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>
            </CardContent>
         </Card>

         <Card>
            <CardHeader>
               <CardTitle className="flex items-center gap-2 text-rose-500">
                  <AlertTriangle className="h-5 w-5" />
                  Productos Críticos (Stock {'<='} 5)
               </CardTitle>
            </CardHeader>
            <CardContent>
               <Table>
                  <TableHeader>
                     <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Ventas</TableHead>
                        <TableHead className="text-right">Stock Actual</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {data.critical_stock.slice(0,10).map(p => (
                        <TableRow key={p.id}>
                           <TableCell className="text-xs font-medium max-w-[150px] truncate">{p.name}</TableCell>
                           <TableCell className="text-right">{p.qty}</TableCell>
                           <TableCell className="text-right font-bold text-rose-500">{p.stock}</TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>
            </CardContent>
         </Card>
      </div>

      {/* 5. Oportunidades Estratégicas */}
      <Card>
         <CardHeader>
            <CardTitle className="flex items-center gap-2">
               <AlertCircle className="h-5 w-5 text-amber-500" />
               Matriz de Oportunidades (Mercado Libre)
            </CardTitle>
         </CardHeader>
         <CardContent>
            <div className="border rounded-md overflow-hidden">
               <Table>
                  <TableHeader>
                     <TableRow>
                        <TableHead>Estado</TableHead>
                        <TableHead>Publicación</TableHead>
                        <TableHead className="text-right">Visitas</TableHead>
                        <TableHead className="text-right">Ventas</TableHead>
                        <TableHead className="text-right">Conversión</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {data.opportunities.map(p => (
                        <TableRow key={p.id}>
                           <TableCell>
                              {p.type === "CRÍTICO" && <Badge variant="destructive" className="bg-rose-500">Crítico</Badge>}
                              {p.type === "ATENCIÓN" && <Badge variant="outline" className="border-amber-500 text-amber-500">Atención</Badge>}
                              {p.type === "OPORTUNIDAD" && <Badge variant="outline" className="border-emerald-500 text-emerald-500">Oportunidad</Badge>}
                           </TableCell>
                           <TableCell className="text-xs font-medium max-w-[200px] truncate" title={p.name}>{p.name}</TableCell>
                           <TableCell className="text-right font-mono">{formatNum(p.visits)}</TableCell>
                           <TableCell className="text-right font-mono">{formatNum(p.sales)}</TableCell>
                           <TableCell className="text-right font-mono">{p.conversion.toFixed(1)}%</TableCell>
                           <TableCell className="text-right font-mono">{p.stock}</TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>
            </div>
         </CardContent>
      </Card>

      {/* 6. Módulo Secundario WooCommerce */}
      <div className="pt-8 mt-8 border-t border-border">
         <h3 className="text-lg font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Canal Secundario: WooCommerce
         </h3>
         <div className="grid gap-4 md:grid-cols-3">
            <Card>
               <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">Ventas Hoy (WC)</CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="text-xl font-bold">{formatCur(data.wc_sales_today)}</div>
               </CardContent>
            </Card>
            <Card>
               <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground">Pedidos Hoy (WC)</CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="text-xl font-bold">{formatNum(data.wc_orders_today)}</div>
               </CardContent>
            </Card>
            <Card>
               <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
                     <PackageX className="h-3 w-3" />
                     Errores Sincronización (WC)
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  <div className={`text-xl font-bold ${data.wc_sync_errors > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                     {formatNum(data.wc_sync_errors)}
                  </div>
               </CardContent>
            </Card>
         </div>
      </div>

    </div>
  )
}
