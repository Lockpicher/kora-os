import { ShoppingBag, Key, Clock, PackageCheck, AlertCircle, Link as LinkIcon, AlertTriangle } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { getMLConnection, getMLListings } from "./actions"
import SyncButton from "@/components/mercadolibre/sync-button"
import Link from "next/link"

export const metadata = {
  title: "Mercado Libre | KORA OS",
}

export const dynamic = "force-dynamic"

export default async function MercadoLibrePage(
  props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }
) {
  const searchParams = await props.searchParams;
  const connectionData = await getMLConnection()
  const listings = await getMLListings()

  const { connected, connection, listingsCount, lastSyncDate } = connectionData

  const formatCurrency = (value: number) => {
    return "$" + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const getSyncStatusBadge = (status: string, hasSku: boolean) => {
    if (!hasSku) return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium border bg-rose-500/10 text-rose-500 border-rose-500/20">Sin SKU 🔴</span>
    if (status === "success") return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Vinculado 🟢</span>
    if (status === "error") return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-500 border-amber-500/20">SKU no encontrado 🟡</span>
    return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium border bg-slate-500/10 text-slate-500 border-slate-500/20">{status}</span>
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingBag className="h-8 w-8 text-yellow-500" />
            Integración: Mercado Libre
          </h2>
          <p className="text-muted-foreground mt-2">
            Importa y audita publicaciones (Read Only). 
          </p>
        </div>
        <div>
          {connected ? (
            <SyncButton />
          ) : (
            <Button asChild className="gap-2">
              <Link href="/api/ml/auth">
                <LinkIcon className="h-4 w-4" /> Conectar Cuenta
              </Link>
            </Button>
          )}
        </div>
      </div>

      {searchParams.error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <p><strong>Error de autenticación:</strong> {String(searchParams.error)}</p>
        </div>
      )}

      {searchParams.success && (
        <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 p-4 rounded-md flex items-center gap-2">
          <PackageCheck className="h-5 w-5" />
          <p>Cuenta conectada exitosamente.</p>
        </div>
      )}

      {/* Widgets de Estado */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Estado de Conexión</CardTitle>
            <Key className={`h-4 w-4 ${connected ? 'text-emerald-500' : 'text-slate-400'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connected ? (
                <span className="text-emerald-500">Activo</span>
              ) : (
                <span className="text-slate-400">Desconectado</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {connected ? connection?.account_name : "Requiere autorización OAuth"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Última Sincronización</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastSyncDate ? new Date(lastSyncDate).toLocaleDateString() : "Nunca"}
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate">
              {lastSyncDate ? new Date(lastSyncDate).toLocaleTimeString() : "No hay registros"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Expiración Token</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connection?.expires_at ? new Date(connection.expires_at).toLocaleDateString() : "N/A"}
            </div>
            <div className="text-xs text-muted-foreground mt-1 truncate">
               El token se refrescará automáticamente
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Publicaciones Mapeadas</CardTitle>
            <PackageCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{listingsCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Registradas en channel_listings</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Conciliación */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Conciliación de Publicaciones (Lectura)</CardTitle>
          <CardDescription>
            Lista de publicaciones en tu cuenta de Mercado Libre. Los productos no vinculados no podrán ser gestionados desde KORA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">MLA ID</TableHead>
                  <TableHead className="min-w-[120px]">SKU ML</TableHead>
                  <TableHead className="min-w-[200px]">Título Publicación</TableHead>
                  <TableHead className="min-w-[200px]">Vinculado a (KORA)</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Precio ML</TableHead>
                  <TableHead className="text-right">Stock ML</TableHead>
                  <TableHead className="text-center">Conciliación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No hay publicaciones sincronizadas aún. Conecta tu cuenta y presiona &quot;Forzar Sincronización&quot;.
                    </TableCell>
                  </TableRow>
                ) : (
                  listings.map((listing) => {
                    // El payload real se extrae del JSON original de source_data
                    const rawData = listing.source_data as Record<string, unknown> || {}
                    const price = Number(rawData.price) || 0
                    const stock = Number(rawData.available_quantity) || 0

                    return (
                      <TableRow key={listing.id}>
                        <TableCell>
                          <a href={listing.permalink} target="_blank" rel="noopener noreferrer" className="font-mono text-sm font-medium text-blue-500 hover:underline">
                            {listing.external_id}
                          </a>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{listing.channel_sku || "N/A"}</TableCell>
                        <TableCell>
                          <p className="font-medium text-foreground line-clamp-1" title={listing.title}>{listing.title}</p>
                        </TableCell>
                        <TableCell>
                          {listing.product_variants ? (
                            (() => {
                              const variant = Array.isArray(listing.product_variants) ? listing.product_variants[0] : listing.product_variants;
                              if (!variant) return <span className="text-xs italic text-muted-foreground">No vinculado</span>;
                              const productsUnknown = variant.products as unknown as Record<string, unknown> | Array<Record<string, unknown>> | null;
                              const prodName = Array.isArray(productsUnknown) ? productsUnknown[0]?.name : productsUnknown?.name;
                              return (
                                <div>
                                  <p className="text-sm font-medium text-foreground">{String(prodName || "Desconocido")}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{variant.sku}</p>
                                </div>
                              );
                            })()
                          ) : (
                            <span className="text-xs italic text-muted-foreground">No vinculado</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${listing.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                            {listing.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(price)}</TableCell>
                        <TableCell className="text-right">{stock}</TableCell>
                        <TableCell className="text-center">
                          {getSyncStatusBadge(listing.last_sync_status, !!listing.channel_sku)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
