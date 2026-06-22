import PurchaseOrderDetailClient from "@/components/purchase-orders/po-detail-client"
import { getPurchaseOrderById } from "../actions"

export const metadata = {
  title: "Detalle de Orden de Compra | KORA OS",
}

export const dynamic = "force-dynamic"

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { success, order, items, error } = await getPurchaseOrderById(id)

  if (!success || !order) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive font-semibold">Error cargando la orden: {error || "No encontrada"}</p>
      </div>
    )
  }

  return <PurchaseOrderDetailClient order={order} items={items || []} />
}
