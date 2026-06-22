import { getReconciliationStats, getReconciliationListings } from "./actions"
import ReconciliationClient from "@/components/mercadolibre/reconciliation-client"

export const metadata = {
  title: "Conciliación Mercado Libre | KORA OS",
}

export default async function ReconciliationPage() {
  const stats = await getReconciliationStats()
  const listings = await getReconciliationListings("all", "")

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Conciliación de Catálogo</h2>
      </div>
      
      <ReconciliationClient initialStats={stats} initialListings={listings} />
    </div>
  )
}
