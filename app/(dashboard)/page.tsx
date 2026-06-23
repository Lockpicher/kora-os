import { createClient } from "@/lib/supabase/server"
import DashboardClient from "@/components/dashboard/dashboard-client"

export const revalidate = 0 // Evita que se cacheen las estadísticas y siempre consulte a Supabase

export interface DashboardVariant {
  id: string
  sku: string
  name: string
  external_reference: string | null
  stock: number
  price: number
  current_cost: number | null
  product_name: string
  utilidad: number
  margen: number
  valor_inventario: number
  utilidad_potencial: number
  status_badge: string
}

export interface DashboardMetrics {
  total_inventory: number
  total_value: number
  potential_profit: number
  purchases_month: number
  average_cost: number
  out_of_stock: number
  
  inventory_coverage: string
  immobilized_capital: number
  inventory_concentration: number
  
  health_total: number
  health_no_cost: number
  health_no_price: number

  // Nuevas métricas Fase 8B
  wc_orders_today: number
  wc_sales_today: number
  sync_errors: number
}

type RawVariant = {
  id: string
  sku: string
  name: string
  external_reference: string | null
  stock: number | null
  price: number | null
  current_cost: number | null
  products: { name: string } | { name: string }[] | null
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Cargar Variantes Activas
  const { data: variantsRawData, error: varError } = await supabase
    .from("product_variants")
    .select(`
      id,
      sku,
      name,
      external_reference,
      stock,
      price,
      current_cost,
      products ( name )
    `)
    .eq("active", true)

  if (varError) {
    console.error("Error fetching variants for dashboard:", varError)
  }

  // 2. Cargar Órdenes de Compra del Mes
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: poData, error: poError } = await supabase
    .from("purchase_orders")
    .select("total")
    .eq("status", "received")
    .gte("created_at", startOfMonth.toISOString())

  if (poError) {
    console.error("Error fetching purchase orders for dashboard:", poError)
  }

  // 3. Cargar Órdenes de WooCommerce de Hoy
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: ordersData } = await supabase
    .from("orders")
    .select("id, total, status, has_sync_error")
    .gte("created_at", today.toISOString())

  let wc_orders_today = 0
  let wc_sales_today = 0
  let sync_errors = 0

  if (ordersData) {
    wc_orders_today = ordersData.length
    wc_sales_today = ordersData.reduce((acc, curr) => acc + Number(curr.total), 0)
    sync_errors = ordersData.filter(o => o.has_sync_error).length
  }

  // === Motor de Cálculo Ejecutivo ===

  const variants: DashboardVariant[] = []
  let total_inventory = 0
  let total_value = 0
  let potential_profit = 0
  
  let out_of_stock = 0
  let immobilized_capital = 0
  
  let health_total = 0
  let health_no_cost = 0
  let health_no_price = 0

  const rawData = (variantsRawData || []) as unknown as RawVariant[]

  for (const v of rawData) {
    const stock = v.stock || 0
    const price = v.price || 0
    const cost = v.current_cost || 0
    
    const utilidad = price - cost
    const margen = price > 0 ? (utilidad / price) * 100 : 0
    const valor_inventario = stock * cost
    const utilidad_potencial = utilidad * stock

    let status_badge = "🟢 Rentable"
    if (cost <= 0) status_badge = "🔴 Sin costo"
    else if (price <= 0) status_badge = "🔴 Sin precio"
    else if (margen < 30) status_badge = "🟡 Margen bajo"

    const prodName = Array.isArray(v.products) ? v.products[0]?.name : v.products?.name
    
    variants.push({
      id: v.id,
      sku: v.sku || "N/A",
      name: v.name,
      external_reference: v.external_reference || null,
      stock,
      price,
      current_cost: v.current_cost,
      product_name: prodName || "Desconocido",
      utilidad,
      margen,
      valor_inventario,
      utilidad_potencial,
      status_badge
    })

    health_total++
    if (stock <= 0) out_of_stock++
    if (v.current_cost === null || v.current_cost <= 0) health_no_cost++
    if (v.price === null || v.price <= 0) health_no_price++

    if (stock > 0) {
      total_inventory += stock
      total_value += valor_inventario
      potential_profit += utilidad_potencial
      
      if (utilidad_potencial <= 0) {
        immobilized_capital += valor_inventario
      }
    }
  }

  const purchases_month = poData ? poData.reduce((acc, curr) => acc + Number(curr.total), 0) : 0
  const average_cost = total_inventory > 0 ? total_value / total_inventory : 0

  // Concentración de Inventario (Top 10 Valor)
  const sortedByValue = [...variants].sort((a, b) => b.valor_inventario - a.valor_inventario)
  const top10Value = sortedByValue.slice(0, 10).reduce((acc, curr) => acc + curr.valor_inventario, 0)
  const inventory_concentration = total_value > 0 ? (top10Value / total_value) * 100 : 0

  const metrics: DashboardMetrics = {
    total_inventory,
    total_value,
    potential_profit,
    purchases_month,
    average_cost,
    out_of_stock,
    inventory_coverage: "N/A",
    immobilized_capital,
    inventory_concentration,
    health_total,
    health_no_cost,
    health_no_price,
    wc_orders_today,
    wc_sales_today,
    sync_errors
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard Ejecutivo</h2>
        <p className="text-muted-foreground mt-2">
          Análisis de rentabilidad y salud del inventario KORA OS.
        </p>
      </div>

      <DashboardClient metrics={metrics} variants={variants} />
    </div>
  )
}
