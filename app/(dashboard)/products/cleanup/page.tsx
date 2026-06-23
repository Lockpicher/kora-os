/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { scanGarbageProducts, executeCleanup } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Trash2, Loader2, Search } from "lucide-react"

export default function CleanupPage() {
  const [scanResult, setScanResult] = useState<any>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleScan = async () => {
    setIsScanning(true)
    setSuccess(false)
    try {
      const res = await scanGarbageProducts()
      setScanResult(res)
    } catch (e: any) {
      alert("Error scanning: " + e.message)
    } finally {
      setIsScanning(false)
    }
  }

  const handleDelete = async () => {
    if (!scanResult || scanResult.totalGarbageIds.length === 0) return
    if (!confirm(`¿Estás 100% seguro de eliminar estos ${scanResult.totalGarbageIds.length} productos y sus variantes irreversiblemente?`)) return
    
    setIsDeleting(true)
    try {
      const res = await executeCleanup(scanResult.totalGarbageIds)
      if (res.success) {
        setSuccess(true)
        setScanResult(null)
      } else {
        alert("Error al eliminar: " + res.error)
      }
    } catch (e: any) {
      alert("Error crítico al eliminar: " + e.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Saneamiento Rápido de Catálogo</h1>
        <p className="text-muted-foreground mt-2">Detecta y elimina productos basura (Placeholders de WooCommerce y Demo Razzi) antes de iniciar las conciliaciones.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auditoría de Basura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleScan} disabled={isScanning || isDeleting}>
            {isScanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Escanear Base de Datos
          </Button>

          {success && (
            <div className="p-4 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 rounded border border-green-200 mt-4">
              <strong>¡Limpieza completada con éxito!</strong> La base de datos ha sido purgada de productos basura.
            </div>
          )}

          {scanResult && (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-muted/30 rounded border">
                  <div className="text-sm font-semibold text-muted-foreground">Placeholders WooCommerce</div>
                  <div className="text-2xl font-bold">{scanResult.placeholders.length}</div>
                </div>
                <div className="p-4 bg-muted/30 rounded border">
                  <div className="text-sm font-semibold text-muted-foreground">Demo Razzi</div>
                  <div className="text-2xl font-bold">{scanResult.demoProducts.length}</div>
                </div>
                <div className="p-4 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 rounded border border-amber-200 dark:border-amber-900">
                  <div className="text-sm font-semibold text-amber-700 dark:text-amber-500">Variantes Afectadas</div>
                  <div className="text-2xl font-bold">{scanResult.variantsCount}</div>
                </div>
              </div>

              {scanResult.totalGarbageIds.length > 0 ? (
                <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-md space-y-4">
                  <h3 className="font-semibold flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" /> 
                    Se encontraron {scanResult.totalGarbageIds.length} productos basura que serán eliminados
                  </h3>
                  
                  <div className="max-h-48 overflow-y-auto text-xs space-y-1 bg-background p-2 rounded border font-mono">
                    {scanResult.placeholders.map((p: any) => <div key={p.id}>[PLACEHOLDER] {p.name}</div>)}
                    {scanResult.demoProducts.map((p: any) => <div key={p.id}>[DEMO] {p.name} (Cat: {p.category})</div>)}
                  </div>

                  <div className="pt-2">
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="w-full sm:w-auto">
                      {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Borrar permanentemente {scanResult.totalGarbageIds.length} productos y sus {scanResult.variantsCount} variantes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground p-4 border rounded text-center bg-muted/10">
                  El Catálogo está limpio. No se detectaron placeholders ni productos demo Razzi.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
