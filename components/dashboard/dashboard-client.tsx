"use client"

import * as React from "react"
import { Package, HandCoins, Vault, AlertTriangle, TrendingUp, TrendingDown, Receipt, ShieldAlert, Activity, HeartPulse, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DashboardMetrics, DashboardVariant } from "@/app/(dashboard)/page"

export default function DashboardClient({ metrics, variants }: { metrics: DashboardMetrics, variants: DashboardVariant[] }) {
  // Sort for Rankings
  const sortedByProfit = [...variants].sort((a, b) => b.utilidad_potencial - a.utilidad_potencial)
  
  const top5 = sortedByProfit.slice(0, 5)
  const bottom5 = sortedByProfit.slice(-5).reverse()

  const formatCurrency = (value: number) => {
    return "$" + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const formatPercent = (value: number) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%"
  }

  const getStatusColor = (status: string) => {
    if (status.includes("Rentable")) return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    if (status.includes("Margen bajo")) return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
    if (status.includes("Sin costo") || status.includes("Sin precio")) return "bg-rose-500/10 text-rose-500 border-rose-500/20"
    return "bg-slate-500/10 text-slate-500 border-slate-500/20"
  }

  const mainStats = [
    {
      title: "Valor Inventario",
      value: formatCurrency(metrics.total_value),
      icon: Vault,
      description: "Capital invertido total",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Utilidad Potencial",
      value: formatCurrency(metrics.potential_profit),
      icon: TrendingUp,
      description: "Ganancia si se vende todo",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Compras Mes",
      value: formatCurrency(metrics.purchases_month),
      icon: Receipt,
      description: "Mercadería recibida",
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
    {
      title: "Inventario Total",
      value: metrics.total_inventory.toLocaleString(),
      icon: Package,
      description: "Unidades físicas",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Costo Promedio",
      value: formatCurrency(metrics.average_cost),
      icon: HandCoins,
      description: "Promedio ponderado",
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
    {
      title: "Sin Stock",
      value: metrics.out_of_stock.toString(),
      icon: AlertTriangle,
      description: "Variantes agotadas",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
  ]

  return (
    <div className="space-y-8">
      {/* 1. Widgets Ejecutivos Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {mainStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="hover:border-primary/50 transition-colors duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bg} p-2 rounded-md shrink-0`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-foreground truncate" title={stat.value}>{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1 truncate">{stat.description}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 2. Riesgo y Salud del Catálogo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border border-l-4 border-l-rose-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Capital Inmovilizado</CardTitle>
            <ShieldAlert className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(metrics.immobilized_capital)}</div>
            <div className="text-xs text-muted-foreground mt-1">Stock &gt; 0 sin utilidad</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Concentración de Riesgo</CardTitle>
            <Activity className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatPercent(metrics.inventory_concentration)}</div>
            <div className="text-xs text-muted-foreground mt-1">Valor en Top 10 SKU vs Total</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Cobertura de Inventario</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.inventory_coverage}</div>
            <div className="text-xs text-muted-foreground mt-1">Meses de stock restante</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Salud del Catálogo</CardTitle>
            <HeartPulse className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Total Variantes:</span> <span className="font-medium text-foreground">{metrics.health_total}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Sin Stock:</span> <span className="font-medium text-rose-500">{metrics.out_of_stock}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Sin Costo:</span> <span className="font-medium text-rose-500">{metrics.health_no_cost}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Sin Precio:</span> <span className="font-medium text-rose-500">{metrics.health_no_price}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Rankings Top / Bottom */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" /> Top 5 Mayor Rentabilidad
            </CardTitle>
            <CardDescription>Generadores de la mayor utilidad potencial.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {top5.map((v, i) => (
                <div key={v.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 truncate mr-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-xs shrink-0">
                      {i + 1}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium leading-none truncate">{v.product_name} - {v.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">Stock: {v.stock} | Margen: {formatPercent(v.margen)}</p>
                    </div>
                  </div>
                  <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400 shrink-0">
                    {formatCurrency(v.utilidad_potencial)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-rose-500" /> Bottom 5 Menor Rentabilidad
            </CardTitle>
            <CardDescription>Productos que consumen capital con menor utilidad.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bottom5.map((v, i) => (
                <div key={v.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 truncate mr-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 font-bold text-xs shrink-0">
                      {variants.length - i}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium leading-none truncate">{v.product_name} - {v.name}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">Stock: {v.stock} | Margen: {formatPercent(v.margen)}</p>
                    </div>
                  </div>
                  <div className="font-bold text-sm text-rose-600 dark:text-rose-400 shrink-0">
                    {formatCurrency(v.utilidad_potencial)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Tabla Principal */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Rentabilidad de Inventario (Catálogo Completo)</CardTitle>
          <CardDescription>
            Análisis detallado de costos, precios, utilidad y valorización por SKU.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">SKU / Ref</TableHead>
                  <TableHead className="min-w-[200px]">Producto</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Utilidad</TableHead>
                  <TableHead className="text-right">Margen %</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Valor Inv.</TableHead>
                  <TableHead className="text-right font-bold">Util. Potencial</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedByProfit.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <p className="font-mono text-sm font-medium">{v.sku}</p>
                      {v.external_reference && (
                        <p className="text-xs text-muted-foreground mt-0.5" title="Referencia Externa / MLA">
                          Ext: {v.external_reference}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{v.product_name}</p>
                      <p className="text-xs text-muted-foreground">{v.name}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(v.status_badge)}`}>
                        {v.status_badge}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(v.current_cost || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(v.price)}</TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      {formatCurrency(v.utilidad)}
                    </TableCell>
                    <TableCell className="text-right">{formatPercent(v.margen)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {v.stock <= 0 ? (
                        <span className="text-destructive">0</span>
                      ) : (
                        v.stock
                      )}
                    </TableCell>
                    <TableCell className="text-right text-amber-600 dark:text-amber-400">
                      {formatCurrency(v.valor_inventario)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground">
                      {formatCurrency(v.utilidad_potencial)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
