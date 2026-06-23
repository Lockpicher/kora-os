import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, X, ArrowRight, Layers } from "lucide-react"

export const metadata = {
  title: "Reconciliación | Mercado Libre",
}

export const dynamic = "force-dynamic"

interface SuggestionItem {
  id: string
  confidence: number
  confidence_reason: Record<string, number> | null
  listing_title: string
  variant_name: string
  created_at: string
  channel_listings: Record<string, unknown> | Record<string, unknown>[] | null
  product_variants: Record<string, unknown> | Record<string, unknown>[] | null
}

export default async function ReconciliationPage() {
  const supabase = await createClient()

  // Obtener sugerencias pendientes
  const { data: suggestions } = await supabase
    .from("reconciliation_suggestions")
    .select(`
      id, confidence, confidence_reason, listing_title, variant_name, created_at,
      channel_listings(channel_sku, external_id, price),
      product_variants(sku, price)
    `)
    .eq("status", "pending")
    .order("confidence", { ascending: false })

  const items = suggestions || []

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Layers className="h-8 w-8 text-amber-500" />
          Reconciliación Manual
        </h2>
        <p className="text-muted-foreground mt-2">
          Revisa y aprueba las coincidencias sugeridas por el motor de Smart Match (85% - 97.9%).
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Check className="h-12 w-12 text-emerald-500 mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Bandeja Limpia</h3>
            <p className="text-muted-foreground mt-2">
              No hay sugerencias pendientes de revisión. Ejecuta el Smart Match para encontrar nuevas coincidencias.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item: SuggestionItem) => {
            const mlListing = Array.isArray(item.channel_listings) ? item.channel_listings[0] : item.channel_listings
            const koraVariant = Array.isArray(item.product_variants) ? item.product_variants[0] : item.product_variants
            const reasons = item.confidence_reason || {}

            return (
              <Card key={item.id} className="overflow-hidden border-amber-500/20">
                <div className="bg-amber-500/10 px-4 py-2 flex items-center justify-between border-b border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-500 border-amber-500/30">
                      Confianza: {item.confidence}%
                    </Badge>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span title="Nombre">Nombre: {String(reasons.name || 0)}%</span> •
                      <span title="SKU">SKU: {String(reasons.sku || 0)}%</span> •
                      <span title="Categoría">Cat: {String(reasons.category || 0)}%</span> •
                      <span title="Precio">Precio: {String(reasons.price || 0)}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-xs bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 px-3 py-1 rounded-md flex items-center gap-1 transition-colors">
                      <X className="h-3 w-3" /> Rechazar
                    </button>
                    <button className="text-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-3 py-1 rounded-md flex items-center gap-1 transition-colors font-medium">
                      <Check className="h-3 w-3" /> Aprobar Enlace
                    </button>
                  </div>
                </div>
                <CardContent className="p-0 grid grid-cols-[1fr_auto_1fr] divide-x">
                  {/* Mercado Libre (Izquierda) */}
                  <div className="p-4 bg-card/50">
                    <p className="text-xs font-semibold text-blue-500 mb-2 uppercase tracking-wider">Mercado Libre</p>
                    <p className="font-medium text-sm line-clamp-2" title={item.listing_title}>{item.listing_title}</p>
                    <div className="mt-3 flex gap-4 text-sm">
                       <div>
                         <p className="text-xs text-muted-foreground">SKU</p>
                         <p className="font-mono">{String(mlListing?.channel_sku || "N/A")}</p>
                       </div>
                       <div>
                         <p className="text-xs text-muted-foreground">Precio</p>
                         <p className="font-mono text-emerald-500">${Number(mlListing?.price || 0).toLocaleString()}</p>
                       </div>
                    </div>
                  </div>

                  {/* Icono de Enlace */}
                  <div className="flex items-center justify-center p-4 bg-muted/30">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* KORA (Derecha) */}
                  <div className="p-4 bg-card/50">
                    <p className="text-xs font-semibold text-purple-500 mb-2 uppercase tracking-wider">Catálogo KORA</p>
                    <p className="font-medium text-sm line-clamp-2" title={item.variant_name}>{item.variant_name}</p>
                    <div className="mt-3 flex gap-4 text-sm">
                       <div>
                         <p className="text-xs text-muted-foreground">SKU</p>
                         <p className="font-mono">{String(koraVariant?.sku || "N/A")}</p>
                       </div>
                       <div>
                         <p className="text-xs text-muted-foreground">Precio</p>
                         <p className="font-mono text-emerald-500">${Number(koraVariant?.price || 0).toLocaleString()}</p>
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
