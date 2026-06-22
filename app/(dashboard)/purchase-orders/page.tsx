import PurchaseOrdersClient from "@/components/purchase-orders/purchase-orders-client"
import { getPurchaseOrders } from "./actions"

export const metadata = {
  title: "Órdenes de Compra | KORA OS",
}

export const dynamic = "force-dynamic"

export default async function PurchaseOrdersPage() {
  const { success, orders, error } = await getPurchaseOrders()

  if (!success) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive font-semibold">Error cargando órdenes: {error}</p>
      </div>
    )
  }

  return <PurchaseOrdersClient initialOrders={orders || []} />
}
