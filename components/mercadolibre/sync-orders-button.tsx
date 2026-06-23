"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowDownToLine } from "lucide-react"
import { syncMLOrders } from "@/app/(dashboard)/integrations/mercadolibre/actions"

export default function SyncOrdersButton() {
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    setIsSyncing(true)
    console.log("Iniciando sincronización de órdenes de ML (90 días)...")

    try {
      const result = await syncMLOrders()
      if (result.success) {
        alert(`✅ Sincronización Exitosa\n\nÓrdenes procesadas: ${result.orders}\nÍtems conciliados: ${result.items}`)
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
      variant="outline"
      onClick={handleSync} 
      disabled={isSyncing}
      className="gap-2 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
    >
      <ArrowDownToLine className={`h-4 w-4 ${isSyncing ? 'animate-bounce' : ''}`} />
      {isSyncing ? "Descargando..." : "Descargar Órdenes"}
    </Button>
  )
}
