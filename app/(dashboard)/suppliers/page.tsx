import SuppliersClient from "@/components/suppliers/suppliers-client"
import { getSuppliers } from "./actions"

export const metadata = {
  title: "Proveedores | KORA OS",
}

export const dynamic = "force-dynamic"

export default async function SuppliersPage() {
  const { success, suppliers, error } = await getSuppliers()

  if (!success) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive font-semibold">Error cargando proveedores: {error}</p>
      </div>
    )
  }

  return <SuppliersClient initialSuppliers={suppliers || []} />
}
