"use client"

import * as React from "react"
import { Plus, ShoppingCart, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PurchaseOrder } from "@/app/(dashboard)/purchase-orders/actions"
import Link from "next/link"

export default function PurchaseOrdersClient({ initialOrders }: { initialOrders: PurchaseOrder[] }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-500 border border-slate-500/20">Borrador</span>
      case "sent":
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">Enviada</span>
      case "partial":
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20">Recepción Parcial</span>
      case "received":
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Recibida</span>
      case "cancelled":
        return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">Cancelada</span>
      default:
        return <span>{status}</span>
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Órdenes de Compra</h2>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Historial de Órdenes</CardTitle>
            <CardDescription>Administra el abastecimiento de mercadería.</CardDescription>
          </div>
          <Link href="/purchase-orders/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Nueva Orden
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {initialOrders.length === 0 ? (
            <Link href="/purchase-orders/new">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-12 cursor-pointer text-muted-foreground text-center">
                <ShoppingCart className="h-12 w-12 mb-4 text-muted-foreground/60" />
                <p className="font-semibold">No hay órdenes de compra registradas</p>
                <p className="text-sm mt-1">Haz clic para crear tu primera orden.</p>
              </div>
            </Link>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[100px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium font-mono text-foreground">{o.number}</TableCell>
                      <TableCell className="text-muted-foreground">{o.suppliers?.name || "-"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(o.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(o.status)}</TableCell>
                      <TableCell className="text-right font-medium">${Number(o.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/purchase-orders/${o.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
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
  )
}
