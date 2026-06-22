"use client"

import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { testMLProduct } from "@/app/(dashboard)/integrations/mercadolibre/actions"
import { useTransition } from "react"

export default function TestProductButton() {
  const [isPending, startTransition] = useTransition()

  const handleTest = () => {
    startTransition(async () => {
      const result = await testMLProduct()
      console.log("=== TEST PRODUCT RESPONSE ===")
      console.log("STATUS:", result.status)
      console.log("BODY:", result.response)
      console.log("=============================")
      alert(`Test concluido (Status: ${result.status}). \nRevisa la consola de desarrollador del navegador (F12) para ver el JSON completo.`)
    })
  }

  return (
    <Button variant="secondary" onClick={handleTest} disabled={isPending} className="gap-2">
      <Search className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Consultando...' : 'Test Product MCOU4107099739'}
    </Button>
  )
}
