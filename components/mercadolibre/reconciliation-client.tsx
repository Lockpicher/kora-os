/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useMemo, useTransition } from "react"
import { Search, RefreshCw, Unlink, AlertCircle, CheckCircle2, ChevronDown, Activity } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getReconciliationSuggestions, linkListingToVariant, unlinkListing } from "@/app/(dashboard)/integrations/mercadolibre/reconciliation/actions"
import { useRouter } from "next/navigation"

export default function ReconciliationClient({ initialStats, initialListings }: any) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  
  const [suggestionsMap, setSuggestionsMap] = useState<Record<string, any[]>>({})
  const [loadingSuggestions, setLoadingSuggestions] = useState<Record<string, boolean>>({})

  const filteredListings = useMemo(() => {
    return initialListings.filter((item: any) => {
      // Filter
      if (filter === "linked" && !item.variant_id) return false
      if (filter === "pending" && (item.variant_id || item.last_sync_status === "error")) return false
      if (filter === "error" && item.last_sync_status !== "error") return false

      // Search
      if (search) {
        const q = search.toLowerCase()
        const matchTitle = item.title?.toLowerCase().includes(q)
        const matchExt = item.external_id?.toLowerCase().includes(q)
        const matchSku = item.channel_sku?.toLowerCase().includes(q)
        if (!matchTitle && !matchExt && !matchSku) return false
      }

      return true
    })
  }, [initialListings, filter, search])

  const handleLoadSuggestions = async (listingId: string, title: string) => {
    setLoadingSuggestions(prev => ({ ...prev, [listingId]: true }))
    const suggestions = await getReconciliationSuggestions(title)
    setSuggestionsMap(prev => ({ ...prev, [listingId]: suggestions }))
    setLoadingSuggestions(prev => ({ ...prev, [listingId]: false }))
  }

  const handleLink = (listingId: string, variantId: string) => {
    startTransition(async () => {
      await linkListingToVariant(listingId, variantId)
      router.refresh()
    })
  }

  const handleUnlink = (listingId: string) => {
    startTransition(async () => {
      await unlinkListing(listingId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Publicaciones</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{initialStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Vinculadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{initialStats.linked}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-600">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{initialStats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Conciliación</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{initialStats.percentage}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por Título ML, ID o SKU..."
            className="w-full pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtro de estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="linked">Vinculados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Publicación ML</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Producto Sugerido</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredListings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No se encontraron publicaciones.
                </TableCell>
              </TableRow>
            ) : (
              filteredListings.map((item: any) => (
                <TableRow key={item.id} className="group">
                  <TableCell>
                    <div className="font-medium text-sm max-w-xs truncate" title={item.title}>
                      {item.title}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                      <span>{item.external_id}</span>
                      {item.channel_sku && <span className="font-mono bg-muted px-1 rounded">{item.channel_sku}</span>}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {item.variant_id ? (
                      <Badge variant="default" className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200">Vinculado</Badge>
                    ) : item.last_sync_status === "error" ? (
                      <Badge variant="destructive">Error</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-200">Pendiente</Badge>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {item.variant_id ? (
                      <div className="text-sm">
                        <div className="font-medium">{item.product_variants?.products?.name || "Desconocido"}</div>
                        <div className="text-xs font-mono text-muted-foreground">{item.product_variants?.sku || "Sin SKU"}</div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {suggestionsMap[item.id] ? (
                          <div className="space-y-2 max-w-sm">
                            {suggestionsMap[item.id].map((sug: any) => (
                              <div key={sug.variant_id} className="flex items-center justify-between bg-muted/50 p-2 rounded-md border text-sm">
                                <div className="overflow-hidden">
                                  <div className="font-medium truncate" title={sug.product_name}>{sug.product_name}</div>
                                  <div className="flex gap-2 items-center mt-1">
                                    <Badge variant="outline" className="text-[10px] py-0">{sug.similarity_score}%</Badge>
                                    <span className="text-xs font-mono text-muted-foreground">{sug.variant_sku}</span>
                                  </div>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => handleLink(item.id, sug.variant_id)}
                                  disabled={isPending}
                                  className="shrink-0 h-8 text-blue-600"
                                >
                                  Vincular
                                </Button>
                              </div>
                            ))}
                            {suggestionsMap[item.id].length === 0 && (
                              <div className="text-xs text-muted-foreground italic">No hay sugerencias.</div>
                            )}
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs h-8"
                            onClick={() => handleLoadSuggestions(item.id, item.title)}
                            disabled={loadingSuggestions[item.id]}
                          >
                            {loadingSuggestions[item.id] ? <RefreshCw className="h-3 w-3 animate-spin mr-2" /> : <ChevronDown className="h-3 w-3 mr-2" />}
                            Ver sugerencias
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    {item.variant_id && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleUnlink(item.id)}
                        disabled={isPending}
                        className="text-destructive h-8"
                      >
                        <Unlink className="h-4 w-4 mr-2" />
                        Desvincular
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
