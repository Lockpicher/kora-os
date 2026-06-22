"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { syncMercadoLibreListings } from "@/app/(dashboard)/integrations/mercadolibre/actions"

export default function SyncButton() {
  const [loading, setLoading] = useState(false)

  const handleSync = async () => {
    setLoading(true)
    const result = await syncMercadoLibreListings()
    setLoading(false)

    if (result.success) {
      alert(`✅ Sincronización exitosa: ${result.message}`)
    } else {
      alert(`❌ Error al sincronizar: ${result.error}`)
    }
  }

  return (
    <Button onClick={handleSync} disabled={loading} className="gap-2">
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Sincronizando...' : 'Forzar Sincronización'}
    </Button>
  )
}
