import * as React from "react"
import Link from "next/link"
import { Store, ShoppingBag, MessageCircle, Package, ArrowRight, CheckCircle2, XCircle, Webhook } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getSalesChannels } from "./actions"

export const metadata = {
  title: "Integraciones | KORA OS",
}

export const dynamic = "force-dynamic"

export default async function IntegrationsPage() {
  const { success, channels, error } = await getSalesChannels()

  if (!success) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-destructive font-semibold">Error cargando canales de venta: {error}</p>
      </div>
    )
  }

  // Mapa para inyectar configuración visual basada en el code del canal
  type ChannelVisualConfig = { description: string; icon: React.ElementType; color: string; bg: string }
  const channelConfig: Record<string, ChannelVisualConfig> = {
    ML: {
      description: "Sincronización bidireccional de inventario, precios y órdenes de compra.",
      icon: ShoppingBag,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    WC: {
      description: "Conecta tu tienda online para gestionar el catálogo desde KORA OS.",
      icon: Store,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    FAL: {
      description: "Publicación automática de productos en el marketplace de Falabella.",
      icon: Package,
      color: "text-green-600",
      bg: "bg-green-600/10",
    },
    WA: {
      description: "Notificaciones automáticas y catálogos en WhatsApp Business.",
      icon: MessageCircle,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    }
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Integraciones</h2>
          <p className="text-muted-foreground mt-2">
            Conecta KORA OS con tus canales de venta y plataformas de comunicación.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {channels?.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg border-border">
            No se encontraron canales de venta en la base de datos.
          </div>
        )}

        {channels?.map((channel) => {
          const config = channelConfig[channel.code] || {
            description: "Canal de venta personalizado.",
            icon: Webhook,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
          }
          
          const Icon = config.icon
          // En el futuro leeremos esto de una tabla `channel_connections`. 
          const isConnected = false 
          
          return (
            <Card key={channel.id} className={`flex flex-col hover:border-primary/50 transition-colors duration-200 ${!channel.active ? 'opacity-50' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-3 rounded-lg ${config.bg}`}>
                    <Icon className={`h-6 w-6 ${config.color}`} />
                  </div>
                  <div className="flex items-center space-x-1">
                    {isConnected ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Conectado
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-500 border border-slate-500/20 gap-1">
                        <XCircle className="h-3 w-3" /> No conectado
                      </span>
                    )}
                  </div>
                </div>
                <CardTitle className="flex items-center gap-2">
                  {channel.name} 
                  {!channel.active && <span className="text-[10px] uppercase font-bold text-muted-foreground border rounded-sm px-1.5 py-0.5">Inactivo</span>}
                </CardTitle>
                <CardDescription className="line-clamp-2 mt-2">
                  {config.description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto pt-4 border-t border-border">
                {(channel.code === "ML" || channel.code === "WC") ? (
                  <Button asChild variant={isConnected ? "outline" : "default"} className="w-full gap-2" disabled={!channel.active}>
                    <Link href={channel.code === "ML" ? "/integrations/mercadolibre" : "/integrations/woocommerce"}>
                      {isConnected ? "Configurar" : "Conectar"} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button variant={isConnected ? "outline" : "default"} className="w-full gap-2" disabled={!channel.active}>
                    {isConnected ? "Configurar" : "Conectar"} <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
