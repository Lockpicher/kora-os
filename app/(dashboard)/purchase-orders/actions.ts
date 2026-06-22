"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { createInventoryMovement } from "@/app/(dashboard)/products/actions"

export type POStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled'

export interface PurchaseOrder {
  id: string
  supplier_id: string
  number: string
  status: POStatus
  subtotal: number
  total: number
  notes: string | null
  created_at: string
  updated_at: string
  suppliers?: {
    id: string
    name: string
  }
}

export interface PurchaseOrderItem {
  id: string
  purchase_order_id: string
  variant_id: string
  quantity: number
  received_quantity: number
  unit_cost: number
  total_cost: number
  created_at: string
  product_variants?: {
    id: string
    sku: string
    name: string
    current_cost: number
  }
}

export interface PurchaseOrderInput {
  supplier_id: string
  subtotal: number
  total: number
  notes?: string
  items: {
    variant_id: string
    quantity: number
    unit_cost: number
    total_cost: number
  }[]
}

export async function getPurchaseOrders(): Promise<{ success: boolean; orders?: PurchaseOrder[]; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("purchase_orders")
    .select(`
      *,
      suppliers (id, name)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching POs:", error)
    return { success: false, error: error.message }
  }

  return { success: true, orders: data || [] }
}

export async function getPurchaseOrderById(id: string): Promise<{ success: boolean; order?: PurchaseOrder; items?: PurchaseOrderItem[]; error?: string }> {
  const supabase = await createClient()
  
  // 1. Obtener la orden
  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .select(`
      *,
      suppliers (id, name, contact_name, email, phone)
    `)
    .eq("id", id)
    .single()

  if (orderError) {
    return { success: false, error: orderError.message }
  }

  // 2. Obtener los items
  const { data: items, error: itemsError } = await supabase
    .from("purchase_order_items")
    .select(`
      *,
      product_variants (id, sku, name, current_cost)
    `)
    .eq("purchase_order_id", id)
    .order("created_at", { ascending: true })

  if (itemsError) {
    return { success: false, error: itemsError.message }
  }

  return { success: true, order, items: items || [] }
}

export async function createPurchaseOrder(data: PurchaseOrderInput): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const supabase = await createClient()

  // 1. Generar número de orden desde el RPC
  const { data: orderNumber, error: rpcError } = await supabase.rpc('get_next_purchase_order_number')
  
  if (rpcError || !orderNumber) {
    console.error("Error generating PO number:", rpcError)
    return { success: false, error: "No se pudo generar el folio de la Orden de Compra." }
  }

  // 2. Insertar Orden (Draft por defecto)
  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .insert([{
      supplier_id: data.supplier_id,
      number: orderNumber,
      status: 'draft',
      subtotal: data.subtotal,
      total: data.total,
      notes: data.notes?.trim() || null
    }])
    .select("id")
    .single()

  if (orderError) {
    console.error("Error creating PO:", orderError)
    return { success: false, error: orderError.message }
  }

  // 3. Insertar Items
  if (data.items && data.items.length > 0) {
    const itemsPayload = data.items.map(item => ({
      purchase_order_id: order.id,
      variant_id: item.variant_id,
      quantity: item.quantity,
      received_quantity: 0,
      unit_cost: item.unit_cost,
      total_cost: item.total_cost
    }))

    const { error: itemsError } = await supabase
      .from("purchase_order_items")
      .insert(itemsPayload)

    if (itemsError) {
      console.error("Error inserting PO items:", itemsError)
      // Rollback soft
      await supabase.from("purchase_orders").delete().eq("id", order.id)
      return { success: false, error: "Error al guardar los items de la orden." }
    }
  }

  revalidatePath("/purchase-orders")
  return { success: true, orderId: order.id }
}

export async function updatePurchaseOrderStatus(id: string, newStatus: POStatus): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 1. Obtener estado actual de la orden y sus items
  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .select("number, status")
    .eq("id", id)
    .single()

  if (orderError || !order) {
    return { success: false, error: "No se encontró la orden de compra." }
  }

  // 2. Validación crítica de estado terminal
  if (order.status === 'received') {
    return { success: false, error: "La orden ya ha sido recibida y es un estado irreversible." }
  }

  // 3. Si el nuevo estado es 'received', procesar inyección de inventario
  if (newStatus === 'received') {
    // Buscar tipo de movimiento de compra
    const { data: moveType } = await supabase
      .from("inventory_movement_types")
      .select("id")
      .eq("code", "ENT_COMPRA")
      .single()

    const typeId = moveType?.id
    if (!typeId) {
       return { success: false, error: "No se encontró el tipo de movimiento de inventario para compras (código ENT_COMPRA)." }
    }

    // Obtener items
    const { data: items, error: itemsError } = await supabase
      .from("purchase_order_items")
      .select("*")
      .eq("purchase_order_id", id)

    if (itemsError || !items) {
      return { success: false, error: "No se pudieron obtener los items para inyectar inventario." }
    }

    // Procesar cada item
    for (const item of items) {
      // a. Crear movimiento de inventario transaccional
      const invRes = await createInventoryMovement({
        variant_id: item.variant_id,
        movement_type_id: typeId,
        quantity: item.quantity,
        reference: order.number,
        notes: `Recepción de orden ${order.number}`,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost
      })

      if (!invRes.success) {
        return { success: false, error: `Error inyectando inventario para variante ${item.variant_id}: ${invRes.error}` }
      }

      // b. Insertar en historial de costos
      await supabase.from("product_cost_history").insert([{
        variant_id: item.variant_id,
        cost: item.unit_cost,
        reference: order.number
      }])

      // c. Actualizar costo actual en la variante (Para Promedios en el futuro)
      await supabase.from("product_variants").update({
        current_cost: item.unit_cost
      }).eq("id", item.variant_id)

      // d. Actualizar received_quantity
      await supabase.from("purchase_order_items").update({
        received_quantity: item.quantity
      }).eq("id", item.id)
    }
  }

  // 4. Finalmente, actualizar el estado de la orden
  const { error: updateError } = await supabase
    .from("purchase_orders")
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)

  if (updateError) {
    console.error("Error updating PO status:", updateError)
    return { success: false, error: updateError.message }
  }

  revalidatePath("/purchase-orders")
  revalidatePath(`/purchase-orders/${id}`)
  revalidatePath("/products") // El inventario y costos cambiaron
  
  return { success: true }
}
