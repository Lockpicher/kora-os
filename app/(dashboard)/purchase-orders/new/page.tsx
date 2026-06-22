import PurchaseOrderNewClient from "@/components/purchase-orders/po-new-client"
import { getSuppliers } from "@/app/(dashboard)/suppliers/actions"
import { getAllVariants } from "@/app/(dashboard)/products/actions"

export const metadata = {
  title: "Nueva Orden de Compra | KORA OS",
}

export const dynamic = "force-dynamic"

export default async function NewPurchaseOrderPage() {
  const [suppliersRes, variantsRes] = await Promise.all([
    getSuppliers(true), // activeOnly = true
    getAllVariants()
  ])

  if (!suppliersRes.success || !variantsRes.success) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive font-semibold">Error cargando dependencias de orden.</p>
      </div>
    )
  }

  return (
    <PurchaseOrderNewClient 
      suppliers={suppliersRes.suppliers || []} 
      variants={variantsRes.variants || []} 
    />
  )
}
