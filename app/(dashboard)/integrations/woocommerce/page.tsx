"use client"

import { useState, useEffect } from "react"
import { getWooCommerceConfig, saveWooCommerceConfig, testWooCommerceConnection } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Store, Link2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

export default function WooCommerceConfigPage() {
  const [storeUrl, setStoreUrl] = useState("")
  const [consumerKey, setConsumerKey] = useState("")
  const [consumerSecret, setConsumerSecret] = useState("")

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  useEffect(() => {
    getWooCommerceConfig().then(res => {
      if (res.success && res.data) {
        setStoreUrl(res.data.credentials.store_url || "")
        setConsumerKey(res.data.credentials.consumer_key || "")
        setConsumerSecret(res.data.credentials.consumer_secret || "")
      }
      setIsLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setMessage(null)
    if (!storeUrl || !consumerKey || !consumerSecret) {
      setMessage({ type: "error", text: "Todos los campos son requeridos." })
      return
    }
    setIsSaving(true)
    const res = await saveWooCommerceConfig(storeUrl, consumerKey, consumerSecret)
    if (res.success) {
      setMessage({ type: "success", text: "Configuración guardada correctamente." })
    } else {
      setMessage({ type: "error", text: res.error || "Error al guardar" })
    }
    setIsSaving(false)
  }

  const handleTest = async () => {
    setMessage(null)
    setIsTesting(true)
    const res = await testWooCommerceConnection()
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Conexión exitosa." })
    } else {
      setMessage({ type: "error", text: res.error || "Error de conexión." })
    }
    setIsTesting(false)
  }

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-purple-500/10 rounded-lg">
          <Store className="h-8 w-8 text-purple-600" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">WooCommerce</h2>
          <p className="text-muted-foreground mt-1">
            Conecta KORA con tu tienda mediante la API REST de WooCommerce.
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Credenciales de API REST</CardTitle>
            <CardDescription>
              Asegúrate de que tu tienda usa HTTPS. Ingresa a WooCommerce &gt; Ajustes &gt; Avanzado &gt; API REST y crea una clave con permisos de Lectura/Escritura.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <div className={`p-4 rounded-md flex items-start gap-3 border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                {message.type === 'success' ? <CheckCircle2 className="h-5 w-5 mt-0.5" /> : <AlertCircle className="h-5 w-5 mt-0.5" />}
                <p className="text-sm font-medium">{message.text}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">URL de la Tienda</label>
              <Input 
                placeholder="https://mitienda.com" 
                value={storeUrl} 
                onChange={e => setStoreUrl(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Consumer Key (ck_...)</label>
              <Input 
                type="password"
                placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                value={consumerKey} 
                onChange={e => setConsumerKey(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Consumer Secret (cs_...)</label>
              <Input 
                type="password"
                placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                value={consumerSecret} 
                onChange={e => setConsumerSecret(e.target.value)} 
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6">
            <Button variant="outline" onClick={handleTest} disabled={isTesting || isSaving}>
              {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Probar Conexión
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isTesting}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Credenciales
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
