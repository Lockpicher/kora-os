"use strict"
"use client"

import { Search, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { testUserProduct, testInventoryItem } from "@/app/(dashboard)/integrations/mercadolibre/actions"
import { useTransition, useState } from "react"

export default function TestProductButton() {
  const [isPending, startTransition] = useTransition()
  const [resultData, setResultData] = useState<unknown>(null)

  const handleTestUP = () => {
    startTransition(async () => {
      const result = await testUserProduct()
      console.log("=== USER PRODUCT RESULT ===")
      console.log(result)
      setResultData(result)
    })
  }

  const handleTestInv = () => {
    startTransition(async () => {
      const result = await testInventoryItem()
      console.log("=== INVENTORY ITEM RESULT ===")
      console.log(result)
      setResultData(result)
    })
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleTestUP} disabled={isPending} className="gap-2">
          <Search className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          {isPending ? 'Cargando...' : 'Test User Product'}
        </Button>
        
        <Button variant="secondary" onClick={handleTestInv} disabled={isPending} className="gap-2">
          <Database className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          {isPending ? 'Cargando...' : 'Test Inventory'}
        </Button>
      </div>
      
      {resultData !== null && (
        <div className="bg-slate-900 text-slate-50 p-4 rounded-md overflow-auto max-h-96 text-xs font-mono w-full break-all">
          <pre>{JSON.stringify(resultData, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
