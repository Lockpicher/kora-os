"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PlayCircle, AlertCircle, Loader2 } from "lucide-react"
import { runSmartReconciliation } from "@/app/(dashboard)/integrations/mercadolibre/actions"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"

export default function SmartMatchButton() {
  const [loading, setLoading] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<Record<string, unknown> | null>(null)

  const router = useRouter()

  const handleRun = async (isDryRun: boolean) => {
    setLoading(true)
    setDryRun(isDryRun)
    setResults(null)
    
    try {
      const res = await runSmartReconciliation({ dryRun: isDryRun })
      if (res.success) {
        alert(`✅ Ejecución ${isDryRun ? "Dry Run" : "LIVE"} completada`)
        setResults((res.stats as Record<string, unknown>) || null)
        if (!isDryRun) router.refresh()
      } else {
        alert(`❌ Error al ejecutar el motor: ${res.error}`)
      }
    } catch {
      alert("❌ Error inesperado de red")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-purple-600 hover:bg-purple-700 text-white border-none">
          <PlayCircle className="h-4 w-4" /> Smart Match
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Motor de Reconciliación Inteligente</DialogTitle>
          <DialogDescription>
            Este motor evalúa las publicaciones huérfanas de ML y las empareja con el catálogo de KORA basándose en Nombre (50%), SKU (20%), Categoría (15%) y Precio (15%).
          </DialogDescription>
        </DialogHeader>

        {!results && (
          <div className="bg-muted p-4 rounded-md text-sm text-muted-foreground flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong>Obligatorio:</strong> Debes ejecutar primero el modo DRY RUN. Esto generará las estadísticas de prueba sin modificar ninguna publicación ni alterar datos en base de datos.
            </p>
          </div>
        )}

        {results && (
          <div className="space-y-4 border rounded-md p-4 bg-card">
            <h4 className="font-semibold text-primary">Resultados de la Ejecución ({dryRun ? "DRY RUN" : "LIVE"})</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground">Listings Analizados</span>
                <p className="text-xl font-bold">{String(results.total || 0)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-emerald-500">Auto-Enlazados (≥98%)</span>
                <p className="text-xl font-bold text-emerald-500">{String(results.autoLink || 0)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-amber-500">Sugerencias (85%-97%)</span>
                <p className="text-xl font-bold text-amber-500">{String(results.suggestions || 0)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-rose-500">Sin Match ({"<85%"})</span>
                <p className="text-xl font-bold text-rose-500">{String(results.noMatch || 0)}</p>
              </div>
            </div>
            
            {dryRun && (
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                Si estás de acuerdo con estos números, puedes ejecutar el motor en modo LIVE para grabar los enlaces en la base de datos.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="mt-4 flex sm:justify-between items-center">
           <Button variant="outline" onClick={() => handleRun(true)} disabled={loading} className="gap-2">
             {loading && dryRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4 text-slate-500" />}
             Ejecutar DRY RUN
           </Button>
           
           <Button variant="default" onClick={() => handleRun(false)} disabled={loading || !results || !dryRun} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
             {loading && !dryRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
             Ejecutar LIVE
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
