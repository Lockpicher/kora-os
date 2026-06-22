"use client"

import * as React from "react"
import { ArrowLeft, Loader2, PackageCheck, Send, Ban, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PurchaseOrder, PurchaseOrderItem, updatePurchaseOrderStatus, POStatus } from "@/app/(dashboard)/purchase-orders/actions"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function PurchaseOrderDetailClient({ 
  order, 
  items 
}: { 
  order: PurchaseOrder; 
  items: PurchaseOrderItem[] 
}) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState("")

  const handleStatusChange = async (newStatus: POStatus) => {
    if (newStatus === "received") {
      const confirmMsg = "Confirmas la recepción completa de la orden?\n\nEsta acción es IRREVERSIBLE e inyectará automáticamente los productos al inventario (Kardex)."
      if (!confirm(confirmMsg)) return
    } else if (newStatus === "cancelled") {
      if (!confirm("¿Deseas cancelar esta orden?")) return
    }

    setIsUpdating(true)
    setErrorMsg("")
    const res = await updatePurchaseOrderStatus(order.id, newStatus)
    if (!res.success) {
      setErrorMsg(res.error || "Ocurrió un error al actualizar el estado.")
    } else {
      router.refresh()
    }
    setIsUpdating(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-slate-500/10 text-slate-500 border border-slate-500/20">Borrador</span>
      case "sent":
        return <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">Enviada al Proveedor</span>
      case "partial":
        return <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20">Recepción Parcial</span>
      case "received":
        return <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Recibida (Inventariada)</span>
      case "cancelled":
        return <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-red-500/10 text-red-500 border border-red-500/20">Cancelada</span>
      default:
        return <span>{status}</span>
    }
  }

  const isTerminal = order.status === "received"

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/purchase-orders">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              Orden {order.number}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Creada el {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div>
          {getStatusBadge(order.status)}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md mb-6 font-medium">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Artículos de la Orden</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-[100px] text-right">Cant. Pedida</TableHead>
                      <TableHead className="w-[100px] text-right">Cant. Recib.</TableHead>
                      <TableHead className="w-[120px] text-right">Costo Unit.</TableHead>
                      <TableHead className="w-[120px] text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="font-medium text-foreground">{item.product_variants?.name || "Variante Eliminada"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.product_variants?.sku}</p>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {item.received_quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          ${Number(item.unit_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${Number(item.total_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Proveedor</p>
                <p className="font-medium text-foreground text-lg">{order.suppliers?.name}</p>
              </div>
              
              {order.notes && (
                <div className="space-y-1 pt-3 border-t border-border">
                  <p className="text-sm text-muted-foreground">Notas Internas</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">${Number(order.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">${Number(order.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.status === "draft" && (
                <Button 
                  className="w-full gap-2" 
                  variant="default"
                  onClick={() => handleStatusChange("sent")}
                  disabled={isUpdating}
                >
                  <Send className="h-4 w-4" /> Marcar como Enviada
                </Button>
              )}
              
              {(order.status === "draft" || order.status === "sent") && (
                <Button 
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" 
                  onClick={() => handleStatusChange("received")}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                  Confirmar Recepción
                </Button>
              )}

              {(order.status === "draft" || order.status === "sent") && (
                <Button 
                  className="w-full gap-2" 
                  variant="destructive"
                  onClick={() => handleStatusChange("cancelled")}
                  disabled={isUpdating}
                >
                  <Ban className="h-4 w-4" /> Cancelar Orden
                </Button>
              )}

              {isTerminal && (
                <div className="text-sm text-muted-foreground text-center flex flex-col items-center gap-2 p-4 bg-muted/20 rounded-md border border-border">
                  <ShoppingCart className="h-6 w-6 text-emerald-500 opacity-50" />
                  Esta orden ya ha sido recibida y el stock fue sumado al inventario. No se pueden deshacer estas acciones.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
