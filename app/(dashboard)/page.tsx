import { createClient } from "@/lib/supabase/server"
import DashboardClient, { MLDashboardData, MLTopProduct, MLRotationProduct, MLOpportunity } from "@/components/dashboard/dashboard-client"

export const revalidate = 0

export default async function DashboardPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const period = (searchParams.period as string) || "30d"
  
  const dateFrom = new Date()
  if (period === "7d") dateFrom.setDate(dateFrom.getDate() - 7)
  else if (period === "90d") dateFrom.setDate(dateFrom.getDate() - 90)
  else dateFrom.setDate(dateFrom.getDate() - 30) // default 30d

  const supabase = await createClient()

  interface MLOrderItem {
    item_id: string
    title: string
    quantity: number
    unit_price: number
    variant_id: string | null
  }

  // 1. Fetch ML Orders
  const { data: mlOrders } = await supabase
    .from("ml_orders")
    .select("id, total_amount, date_created")
    .gte("date_created", dateFrom.toISOString())

  const orderIds = mlOrders?.map(o => o.id) || []

  // 2. Fetch ML Order Items for these orders
  let mlOrderItems: MLOrderItem[] = []
  if (orderIds.length > 0) {
     const { data: itemsData } = await supabase
       .from("ml_order_items")
       .select("*")
       .in("order_id", orderIds)
     mlOrderItems = (itemsData || []) as MLOrderItem[]
  }

  // 3. Fetch Product Variants (active)
  const { data: variantsData } = await supabase
    .from("product_variants")
    .select("id, sku, stock, current_cost, products(name)")
    .eq("active", true)

  const variantMap = new Map()
  if (variantsData) {
     variantsData.forEach(v => {
        const prods = v.products as unknown as { name: string } | { name: string }[] | null
        const prodName = Array.isArray(prods) ? prods[0]?.name : prods?.name
        variantMap.set(v.id, {
           stock: v.stock || 0,
           cost: v.current_cost || 0,
           name: prodName || v.sku || "N/A",
           sku: v.sku
        })
     })
  }

  // 4. Fetch ML Item Metrics (ALL) to deduplicate and find active & visits
  const { data: mlMetricsData } = await supabase
    .from("ml_item_metrics")
    .select("item_id, status, visits, synced_at")

  const itemMetricsMap = new Map()
  if (mlMetricsData) {
     mlMetricsData.forEach(m => {
        const existing = itemMetricsMap.get(m.item_id)
        // Guardar el más reciente
        if (!existing || new Date(m.synced_at) > new Date(existing.synced_at)) {
           itemMetricsMap.set(m.item_id, m)
        }
     })
  }

  // --- CALCULATION LOGIC ---
  const sales_30d = mlOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0
  const orders_30d = mlOrders?.length || 0
  const avg_ticket = orders_30d > 0 ? sales_30d / orders_30d : 0
  
  const active_listings = Array.from(itemMetricsMap.values()).filter(x => x.status === "active").length

  let units_sold = 0
  const products_sold_set = new Set()
  let reconciled_revenue = 0
  let cogs = 0
  let orphan_revenue = 0

  interface MLProductStat {
     item_id: string
     title: string
     qty: number
     revenue: number
     profit: number
     margin: number
     variantId: string | null
  }

  const productStats = new Map<string, MLProductStat>() // map by item_id

  for (const item of mlOrderItems) {
     units_sold += item.quantity
     products_sold_set.add(item.item_id)

     const revenue = Number(item.quantity) * Number(item.unit_price)

     const existingStat = productStats.get(item.item_id) || {
        item_id: item.item_id,
        title: item.title,
        qty: 0,
        revenue: 0,
        profit: 0,
        margin: 0,
        variantId: item.variant_id
     }

     existingStat.qty += item.quantity
     existingStat.revenue += revenue

     if (item.variant_id && variantMap.has(item.variant_id)) {
        const vInfo = variantMap.get(item.variant_id)
        const cost = Number(vInfo.cost) * item.quantity
        reconciled_revenue += revenue
        cogs += cost

        existingStat.profit += (revenue - cost)
     } else {
        orphan_revenue += revenue
     }

     productStats.set(item.item_id, existingStat)
  }

  const gross_profit = reconciled_revenue - cogs
  const gross_margin = reconciled_revenue > 0 ? (gross_profit / reconciled_revenue) * 100 : 0
  const products_sold = products_sold_set.size

  // Global Conversion
  const total_visits = Array.from(itemMetricsMap.values()).reduce((sum, x) => sum + (x.visits || 0), 0)
  const global_conversion = total_visits > 0 ? (units_sold / total_visits) * 100 : 0

  // Lists for Tables
  const allStats = Array.from(productStats.values())
  allStats.forEach(s => {
     s.margin = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0
  })

  const getVariantName = (s: MLProductStat) => {
     if (s.variantId && variantMap.has(s.variantId)) return variantMap.get(s.variantId).name
     return s.title || s.item_id
  }
  const getVariantStock = (s: MLProductStat) => {
     if (s.variantId && variantMap.has(s.variantId)) return variantMap.get(s.variantId).stock
     return 0
  }

  const top_by_units: MLTopProduct[] = [...allStats]
    .sort((a,b) => b.qty - a.qty)
    .map(s => ({ id: s.item_id, sku: s.item_id, name: getVariantName(s), qty: s.qty, revenue: s.revenue, profit: s.profit, margin: s.margin, stock: getVariantStock(s) }))
  
  const top_by_revenue: MLTopProduct[] = [...allStats]
    .sort((a,b) => b.revenue - a.revenue)
    .map(s => ({ id: s.item_id, sku: s.item_id, name: getVariantName(s), qty: s.qty, revenue: s.revenue, profit: s.profit, margin: s.margin, stock: getVariantStock(s) }))
  
  const top_by_profit: MLTopProduct[] = [...allStats]
    .filter(s => s.variantId) // exclude orphans
    .sort((a,b) => b.profit - a.profit)
    .map(s => ({ id: s.item_id, sku: s.item_id, name: getVariantName(s), qty: s.qty, revenue: s.revenue, profit: s.profit, margin: s.margin, stock: getVariantStock(s) }))

  const top_rotation: MLRotationProduct[] = top_by_units.map(s => {
     const coverage = s.qty > 0 ? Math.round((s.stock / s.qty) * 30) : "> 90 días"
     return { id: s.id, name: s.name, stock: s.stock, qty: s.qty, coverage }
  })

  const critical_stock: MLRotationProduct[] = top_by_units
    .filter(s => s.stock <= 5)
    .sort((a,b) => b.qty - a.qty)
    .map(s => ({ id: s.id, name: s.name, stock: s.stock, qty: s.qty, coverage: "N/A" }))

  // Opportunities
  const opportunities: MLOpportunity[] = []
  Array.from(itemMetricsMap.values()).forEach(m => {
     const stat = productStats.get(m.item_id)
     const sales = stat ? stat.qty : 0
     const visits = m.visits || 0
     const conversion = visits > 0 ? (sales / visits) * 100 : 0
     let stock = 0
     if (stat && stat.variantId && variantMap.has(stat.variantId)) stock = variantMap.get(stat.variantId).stock
     const name = stat ? getVariantName(stat) : m.item_id
     
     let type: MLOpportunity["type"] | null = null
     if (visits > 100 && sales === 0) type = "CRÍTICO"
     else if (stock <= 5 && sales > 0) type = "ATENCIÓN"
     else if (conversion > 2 && stock > 10) type = "OPORTUNIDAD"

     if (type) {
        opportunities.push({ id: m.item_id, name, visits, sales, stock, conversion, type })
     }
  })
  
  opportunities.sort((a,b) => {
     const p = { "CRÍTICO": 1, "ATENCIÓN": 2, "OPORTUNIDAD": 3 }
     if (p[a.type] !== p[b.type]) return p[a.type] - p[b.type]
     return b.visits - a.visits
  })

  // WooCommerce fallback
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { data: wcOrdersData } = await supabase.from("orders").select("total, has_sync_error").gte("created_at", today.toISOString())
  const wc_orders_today = wcOrdersData?.length || 0
  const wc_sales_today = wcOrdersData?.reduce((acc, curr) => acc + Number(curr.total), 0) || 0
  const wc_sync_errors = wcOrdersData?.filter(o => o.has_sync_error).length || 0

  const data: MLDashboardData = {
     sales_30d, orders_30d, avg_ticket, active_listings, units_sold, products_sold,
     global_conversion, potential_roas: "Sin datos Ads",
     reconciled_revenue, cogs, gross_profit, gross_margin, orphan_revenue,
     top_by_units, top_by_revenue, top_by_profit, top_rotation, critical_stock,
     opportunities: opportunities.slice(0,20),
     wc_orders_today, wc_sales_today, wc_sync_errors
  }

  return (
    <div className="space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Ejecutivo</h2>
        <p className="text-muted-foreground">
          Inteligencia comercial KORA OS orientada a Mercado Libre.
        </p>
      </div>
      <DashboardClient data={data} />
    </div>
  )
}
