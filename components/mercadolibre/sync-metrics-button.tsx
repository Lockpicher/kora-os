"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { syncMLMetrics } from "@/app/(dashboard)/integrations/mercadolibre/actions"

export default function SyncMetricsButton() {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    
    // Mostramos un alert o console simple
    console.log("Iniciando sincronización de métricas de ML...")

    try {
      const result = await syncMLMetrics()
      if (result.success) {
        alert(`✅ Sincronización Exitosa\n\nTotal: ${result.found}\nVinculadas: ${result.linked}\nHuérfanas creadas: ${result.orphans}\nErrores: ${result.errors}`)
      } else {
        alert(`❌ Error de Sincronización\n${result.error || "Ocurrió un error desconocido"}`)
      }
    } catch (e: unknown) {
      alert(`❌ Error de ejecución\n${e instanceof Error ? e.message : "Error desconocido"}`)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Button 
      variant="default"
      onClick={handleSync} 
      disabled={isSyncing}
      className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
    >
      <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? "Sincronizando..." : "Sincronizar Métricas"}
    </Button>
  )
}
