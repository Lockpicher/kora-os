"use client"

import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { disconnectMercadoLibre } from "@/app/(dashboard)/integrations/mercadolibre/actions"
import { useTransition } from "react"
import { useRouter } from "next/navigation"

export default function DisconnectButton({ connectionId }: { connectionId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDisconnect = () => {
    startTransition(async () => {
      const result = await disconnectMercadoLibre(connectionId)
      if (result.success) {
        alert("Cuenta desconectada exitosamente")
        router.refresh()
      } else {
        alert(`Error al desconectar: ${result.error}`)
      }
    })
  }

  return (
    <Button variant="destructive" onClick={handleDisconnect} disabled={isPending} className="gap-2">
      <LogOut className={`h-4 w-4 ${isPending ? 'animate-pulse' : ''}`} />
      {isPending ? 'Desconectando...' : 'Desconectar'}
    </Button>
  )
}
