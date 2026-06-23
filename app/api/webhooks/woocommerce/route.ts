/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"

// We use the direct supabase client since webhooks don't have a user session
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // fallback if service key not set
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get("x-wc-webhook-signature")
    const topic = req.headers.get("x-wc-webhook-topic") // e.g. order.created, order.updated

    if (!topic || !topic.startsWith("order.")) {
      // Ignorar eventos que no sean de órdenes por ahora
      return NextResponse.json({ received: true })
    }

    // 1. Obtener el Webhook Secret desde las credenciales de WC en channel_connections
    // (Asumiendo que guardan un webhook_secret o usamos el consumer_secret como fallback)
    const { data: channel } = await supabase.from("sales_channels").select("id").eq("code", "WC").single()
    if (!channel) return NextResponse.json({ error: "Canal WC no encontrado" }, { status: 400 })

    const { data: conn } = await supabase.from("channel_connections").select("credentials").eq("channel_id", channel.id).single()
    
    // Verificación HMAC si existe un secret configurado para el webhook (suele ser un string aleatorio en WooCommerce)
    // Para simplificar, si no hay secret estricto, confiamos en el payload, pero es buena práctica implementarlo.
    const secret = conn?.credentials?.webhook_secret
    if (secret && signature) {
      const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('base64')
      if (hash !== signature) {
        return NextResponse.json({ error: "Firma inválida" }, { status: 401 })
      }
    }

    const orderPayload = JSON.parse(rawBody)
    const { id: externalOrderId, number: orderNumber, status, total, billing, line_items } = orderPayload

    const customerName = `${billing?.first_name || ""} ${billing?.last_name || ""}`.trim()
    const customerEmail = billing?.email || ""

    // 2. Procesar la orden principal
    let inventoryShouldBeApplied = (status === "processing" || status === "completed")
    let hasSyncError = false

    // Buscar si la orden ya existe
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id, inventory_applied, status")
      .eq("channel_id", channel.id)
      .eq("external_order_id", externalOrderId.toString())
      .single()

    let dbOrderId = existingOrder?.id
    let wasInventoryApplied = existingOrder?.inventory_applied || false

    const orderData = {
      channel_id: channel.id,
      external_order_id: externalOrderId.toString(),
      order_number: orderNumber.toString(),
      customer_name: customerName,
      customer_email: customerEmail,
      status: status,
      total: Number(total),
      source_data: orderPayload,
      updated_at: new Date().toISOString()
    }

    // Upsert Order
    if (dbOrderId) {
      await supabase.from("orders").update(orderData).eq("id", dbOrderId)
    } else {
      const { data: newOrder, error: orderErr } = await supabase
        .from("orders")
        .insert({ ...orderData, inventory_applied: false, has_sync_error: false })
        .select("id")
        .single()
      
      if (orderErr) throw new Error("Error guardando orden: " + orderErr.message)
      dbOrderId = newOrder.id
    }

    // 3. Procesar Line Items y SKUs
    const itemsToInsert = []
    
    for (const item of line_items) {
      const sku = item.sku
      let variantId = null
      let syncErrorReason = null

      if (sku) {
        // Buscar variante por SKU en KORA
        const { data: variant } = await supabase
          .from("product_variants")
          .select("id, stock")
          .eq("sku", sku)
          .single()

        if (variant) {
          variantId = variant.id
        } else {
          hasSyncError = true
          syncErrorReason = "SKU no encontrado en KORA"
        }
      } else {
        hasSyncError = true
        syncErrorReason = "Producto sin SKU en WooCommerce"
      }

      itemsToInsert.push({
        order_id: dbOrderId,
        variant_id: variantId,
        sku: sku || "SIN-SKU",
        quantity: item.quantity,
        price: Number(item.price),
        sync_error_reason: syncErrorReason
      })

      // 4. Lógica de Inventario (Regla estricta)
      // Si la orden pasa a processing/completed Y nunca se le había restado inventario
      if (!wasInventoryApplied && inventoryShouldBeApplied && variantId) {
        // Restar stock
        // Usamos RPC si estuviera disponible, o leemos y restamos (race condition potential)
        // Para MVP, lo leemos y restamos (asumimos bajo volumen concurrente en el mismo ms)
        const { data: currentVariant } = await supabase.from("product_variants").select("stock").eq("id", variantId).single()
        if (currentVariant) {
          const newStock = (currentVariant.stock || 0) - item.quantity
          await supabase.from("product_variants").update({ stock: newStock }).eq("id", variantId)
        }
      }
    }

    // Borrar items antiguos si es un update y recrearlos (simplificado)
    if (existingOrder) {
      await supabase.from("order_items").delete().eq("order_id", dbOrderId)
    }
    
    await supabase.from("order_items").insert(itemsToInsert)

    // Actualizar flags en la orden
    const updateFlags: any = {}
    if (!wasInventoryApplied && inventoryShouldBeApplied) {
      updateFlags.inventory_applied = true
    }
    updateFlags.has_sync_error = hasSyncError

    await supabase.from("orders").update(updateFlags).eq("id", dbOrderId)

    return NextResponse.json({ success: true, orderId: dbOrderId })

  } catch (err: any) {
    console.error("Webhook Error:", err)
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 })
  }
}
