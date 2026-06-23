"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getMLConnection() {
  const supabase = await createClient()

  // 1. Obtener ID de canal ML
  const { data: channelData } = await supabase
    .from("sales_channels")
    .select("id")
    .eq("code", "ML")
    .single()

  if (!channelData) return { success: false, error: "Canal ML no encontrado" }

  // 2. Obtener la conexión activa (asumimos 1 conexión de ML por ahora)
  const { data: connection } = await supabase
    .from("channel_connections")
    .select("*")
    .eq("channel_id", channelData.id)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!connection) {
    return { success: true, connected: false }
  }

  // 3. Obtener stats de publicaciones en KORA
  const { count } = await supabase
    .from("channel_listings")
    .select("*", { count: 'exact', head: true })
    .eq("channel_id", channelData.id)

  const { data: lastSync } = await supabase
    .from("channel_listings")
    .select("synced_at")
    .eq("channel_id", channelData.id)
    .not("synced_at", "is", null)
    .order("synced_at", { ascending: false })
    .limit(1)
    .single()

  return { 
    success: true, 
    connected: true, 
    connection,
    listingsCount: count || 0,
    lastSyncDate: lastSync?.synced_at || null
  }
}

export async function getMLListings() {
  const supabase = await createClient()
  
  const { data: channelData } = await supabase
    .from("sales_channels")
    .select("id")
    .eq("code", "ML")
    .single()

  if (!channelData) return []

  const { data } = await supabase
    .from("channel_listings")
    .select(`
      id,
      external_id,
      channel_sku,
      title,
      status,
      permalink,
      last_sync_status,
      variant_id,
      source_data,
      product_variants (
        id,
        sku,
        products ( name )
      )
    `)
    .eq("channel_id", channelData.id)
    .order("created_at", { ascending: false })

  return data || []
}

export async function disconnectMercadoLibre(connectionId: string) {
  try {
    const supabase = await createClient()
    await supabase
      .from("channel_connections")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", connectionId)
    
    revalidatePath("/integrations/mercadolibre")
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido al desconectar" }
  }
}

export async function refreshMercadoLibreToken(connection: { id: string; access_token: string; refresh_token: string; expires_at: string; [key: string]: unknown }) {
  const expiresAt = new Date(connection.expires_at).getTime()
  const now = Date.now()
  const REFRESH_MARGIN_MS = 15 * 60 * 1000 // 15 minutos

  // Si el token aún es válido (considerando el margen), devolverlo tal cual
  if (expiresAt > now + REFRESH_MARGIN_MS) {
    return connection.access_token
  }

  // Token expirado o a punto de expirar, renovar
  const appId = process.env.ML_APP_ID
  const clientSecret = process.env.ML_CLIENT_SECRET

  if (!appId || !clientSecret) {
    throw new Error("Credenciales de Mercado Libre no configuradas en entorno")
  }

  const tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: appId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token
    })
  })

  const tokenData = await tokenResponse.json()
  const supabase = await createClient()

  if (!tokenResponse.ok) {
    console.error("Refresh Token FAILED:", tokenData)
    // Marcar conexión como inactiva si el refresh token murió
    await supabase
      .from("channel_connections")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", connection.id)

    throw new Error("Mercado Libre requiere reconexión manual")
  }

  const { access_token, refresh_token, expires_in } = tokenData
  const newExpiresAt = new Date(now + expires_in * 1000).toISOString()
  const currentIso = new Date(now).toISOString()

  await supabase
    .from("channel_connections")
    .update({
      access_token,
      refresh_token,
      expires_at: newExpiresAt,
      updated_at: currentIso,
      last_refresh_at: currentIso
    })
    .eq("id", connection.id)

  return access_token
}

export async function syncMercadoLibreListings() {
  try {
    const supabase = await createClient()
    const mlConnection = await getMLConnection()

    if (!mlConnection.success || !mlConnection.connected || !mlConnection.connection) {
      return {
        success: false,
        error: "No hay cuenta de Mercado Libre conectada."
      }
    }

    const { external_user_id, channel_id } = mlConnection.connection
    
    // Obtener token fresco (se renueva automáticamente si expiró o está a punto de expirar)
    const access_token = await refreshMercadoLibreToken(mlConnection.connection)

    console.log("====================================")
    console.log("INICIANDO SINCRONIZACIÓN ML")
    console.log("Usuario:", external_user_id)
    console.log("====================================")

    // ==========================
    // PASO 1 - OBTENER TODOS LOS IDS
    // ==========================

    const itemIds: string[] = []
    let offset = 0
    const limit = 50
    let total = 1

    while (offset < total) {
      console.log(`BUSCANDO IDS -> offset=${offset} limit=${limit}`)

      const itemsSearchRes = await fetch(
        `https://api.mercadolibre.com/users/${external_user_id}/items/search?offset=${offset}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`
          }
        }
      )

      console.log(
        "SEARCH RESPONSE:",
        itemsSearchRes.status,
        itemsSearchRes.statusText
      )

      if (!itemsSearchRes.ok) {
        const errBody = await itemsSearchRes.text()

        console.error("ERROR SEARCH:", errBody)

        return {
          success: false,
          error: `Error fetching ML items: ${itemsSearchRes.statusText}`,
          details: errBody
        }
      }

      const itemsSearchBody = await itemsSearchRes.json()

      total = itemsSearchBody.paging?.total || 0

      if (Array.isArray(itemsSearchBody.results)) {
        itemIds.push(...itemsSearchBody.results)
      }

      console.log(
        `RECUPERADOS ${itemIds.length} DE ${total}`
      )

      offset += limit

      if (itemIds.length >= total) {
        break
      }
    }

    console.log("====================================")
    console.log("TOTAL ITEM IDS:", itemIds.length)
    console.log("====================================")

    if (itemIds.length === 0) {
      return {
        success: true,
        message: "No se encontraron publicaciones en Mercado Libre.",
        synced: 0
      }
    }

    // ==========================
    // PASO 2 - OBTENER DETALLE ITEMS
    // ==========================

    const chunkSize = 20
    let syncedCount = 0

    for (let i = 0; i < itemIds.length; i += chunkSize) {
      console.log(
        `LOTE ${i} - ${Math.min(i + chunkSize, itemIds.length)}`
      )

      const chunkIds = itemIds.slice(i, i + chunkSize)
      const idsParam = chunkIds.join(",")

      const itemsRes = await fetch(
        `https://api.mercadolibre.com/items?ids=${idsParam}`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`
          }
        }
      )

      console.log(
        "ITEMS RESPONSE:",
        itemsRes.status,
        itemsRes.statusText
      )

      if (!itemsRes.ok) {
        const errBody = await itemsRes.text()

        console.error("ERROR ITEMS:", errBody)

        continue
      }

      const itemsBody = await itemsRes.json()

      for (const itemWrapper of itemsBody) {
        if (itemWrapper.code !== 200) continue

        const item = itemWrapper.body

        const externalId = item.id
        const title = item.title
        const status = item.status
        const permalink = item.permalink

        // Se ha removido el bloque de diagnóstico anterior para centrarse en la consulta global de /products

        const channelSku =
          item.seller_custom_field ||
          null
          
        const inventoryId = item.inventory_id || null
        const userProductId = item.user_product_id || null

        let variantId = null
        let syncStatus = "success"
        let syncError = null

        if (channelSku) {
          const { data: variantObj } = await supabase
            .from("product_variants")
            .select("id")
            .eq("sku", channelSku)
            .single()

          if (variantObj) {
            variantId = variantObj.id
          } else {
            syncStatus = "error"
            syncError = "SKU not found in KORA"
          }
        } else {
          syncStatus = "error"
          syncError = "No SKU provided in ML"
        }

        console.log(
          "UPSERT:",
          externalId,
          channelSku
        )

        const upsertData = {
          channel_id: channel_id,
          external_id: externalId,
          channel_sku: channelSku,
          title,
          permalink,
          status,
          variant_id: variantId,
          source_data: item,
          last_sync_status: syncStatus,
          sync_error: syncError,
          user_product_id: userProductId,
          inventory_id: inventoryId,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { error: upsertError } = await supabase
          .from("channel_listings")
          .upsert(upsertData, {
            onConflict: "channel_id,external_id"
          })

        if (upsertError) {
          console.error(
            "ERROR UPSERT:",
            externalId,
            upsertError
          )
        } else {
          syncedCount++
        }
      }
    }

    console.log("====================================")
    revalidatePath("/integrations/mercadolibre")

    return {
      success: true,
      message: `Sincronización completada. ${syncedCount} publicaciones mapeadas.`,
      synced: syncedCount
    }
  } catch (e) {
    console.error("Exception in syncMercadoLibreListings:", e)
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error"
    }
  }
}

// ==========================================
// FASE 9A: SYNC ML METRICS
// ==========================================
export async function syncMLMetrics() {
  try {
    const supabase = await createClient()
    const mlConnection = await getMLConnection()

    if (!mlConnection.success || !mlConnection.connected || !mlConnection.connection) {
      return { success: false, error: "No hay conexión a Mercado Libre." }
    }

    const { external_user_id, channel_id } = mlConnection.connection
    const access_token = await refreshMercadoLibreToken(mlConnection.connection)

    // 1. Obtener todos los IDs activos y pausados
    const itemIds: string[] = []
    let offset = 0
    const limit = 50
    let total = 1

    while (offset < total) {
      const searchRes = await fetch(
        `https://api.mercadolibre.com/users/${external_user_id}/items/search?offset=${offset}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      )
      
      if (!searchRes.ok) throw new Error("Error fetching ML items search")
      
      const searchBody = await searchRes.json()
      total = searchBody.paging?.total || 0
      
      if (Array.isArray(searchBody.results)) {
        itemIds.push(...searchBody.results)
      }
      
      offset += limit
      if (itemIds.length >= total) break
    }

    if (itemIds.length === 0) {
      return { success: true, message: "No se encontraron publicaciones.", found: 0, linked: 0, orphans: 0, errors: 0 }
    }

    // 2. Procesar detalles en lotes de 20
    const chunkSize = 20
    let linked = 0
    let orphans = 0
    let errors = 0

    // Para evitar consultas 1 a 1 de channel_listings, precargamos los mappings
    const { data: existingListings } = await supabase
      .from("channel_listings")
      .select("id, external_id")
      .eq("channel_id", channel_id)

    const listingMap = new Map()
    if (existingListings) {
      for (const l of existingListings) {
        listingMap.set(l.external_id, l.id)
      }
    }

    for (let i = 0; i < itemIds.length; i += chunkSize) {
      const chunkIds = itemIds.slice(i, i + chunkSize)
      const idsParam = chunkIds.join(",")

      const itemsRes = await fetch(
        `https://api.mercadolibre.com/items?ids=${idsParam}`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      )

      if (!itemsRes.ok) {
        errors += chunkIds.length
        continue
      }

      const itemsBody = await itemsRes.json()

      for (const itemWrapper of itemsBody) {
        if (itemWrapper.code !== 200) {
          errors++
          continue
        }

        const item = itemWrapper.body
        
        let channelListingId = listingMap.get(item.id)

        // Huérfanos: Si no existe en channel_listings, lo creamos
        if (!channelListingId) {
          const { data: newListing, error: insErr } = await supabase
            .from("channel_listings")
            .insert({
              channel_id: channel_id,
              external_id: item.id,
              channel_sku: item.seller_custom_field || null,
              title: item.title,
              permalink: item.permalink,
              status: "orphan", // Marcamos como huérfano explícitamente
              source_data: item,
              synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select("id")
            .single()

          if (newListing) {
            channelListingId = newListing.id
            listingMap.set(item.id, channelListingId)
            orphans++
          } else {
            console.error("Error creating orphan listing", insErr)
            errors++
            continue
          }
        } else {
          linked++
        }

        // Insertar en ml_item_metrics
        // Nota: permalink fue agregado como requiremento extra, lo guardamos si la columna fue creada
        // o mapeamos snapshot_date a synced_at.
        const metricsData: Record<string, unknown> = {
          item_id: item.id,
          title: item.title,
          price: item.price,
          available_quantity: item.available_quantity,
          sold_quantity: item.sold_quantity,
          status: item.status,
          listing_type: item.listing_type_id,
          channel_listing_id: channelListingId,
          synced_at: new Date().toISOString()
        }

        // Manejo safe por si no corrieron el patch
        try {
          const { error: metricErr } = await supabase
            .from("ml_item_metrics")
            .insert(metricsData)
            
          if (metricErr) {
            // Intento fall-back agregando permalink si existe la columna
             metricsData.permalink = item.permalink
             await supabase.from("ml_item_metrics").insert(metricsData)
          }
        } catch (e) {
           console.error("Metric insert error", e)
           errors++
        }
      }
    }

    revalidatePath("/integrations/mercadolibre")
    
    return {
      success: true,
      found: itemIds.length,
      linked,
      orphans,
      errors
    }

  } catch (e: unknown) {
    console.error("Exception in syncMLMetrics:", e)
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}

export async function testUserProduct() {
  try {
    const mlConnection = await getMLConnection()
    if (!mlConnection.success || !mlConnection.connected || !mlConnection.connection) {
      return { success: false, error: "No connection", status: 401 }
    }

    const access_token = await refreshMercadoLibreToken(mlConnection.connection)
    
    const res = await fetch(`https://api.mercadolibre.com/user-products/MCOU2428208945`, {
      headers: { Authorization: `Bearer ${access_token}` }
    })
    
    const headersObj = Object.fromEntries(res.headers.entries())
    const data = res.ok ? await res.json() : await res.text()
    
    return { success: res.ok, status: res.status, headers: headersObj, response: data }
  } catch (err: unknown) {
    return { success: false, status: 500, response: err instanceof Error ? err.message : String(err) }
  }
}

export async function testInventoryItem() {
  try {
    const mlConnection = await getMLConnection()
    if (!mlConnection.success || !mlConnection.connected || !mlConnection.connection) {
      return { success: false, error: "No connection", status: 401 }
    }

    const access_token = await refreshMercadoLibreToken(mlConnection.connection)
    
    let res = await fetch(`https://api.mercadolibre.com/inventory_items/NUSK41503`, {
      headers: { Authorization: `Bearer ${access_token}` }
    })
    
    let endpoint = "inventory_items"
    
    if (!res.ok) {
      res = await fetch(`https://api.mercadolibre.com/stock/store/items/NUSK41503`, {
        headers: { Authorization: `Bearer ${access_token}` }
      })
      endpoint = "stock/store/items"
    }

    const headersObj = Object.fromEntries(res.headers.entries())
    const data = res.ok ? await res.json() : await res.text()
    
    return { success: res.ok, endpoint, status: res.status, headers: headersObj, response: data }
  } catch (err: unknown) {
    return { success: false, status: 500, response: err instanceof Error ? err.message : String(err) }
  }
}

// ==========================================
// FASE 9A: SYNC ML ORDERS (90 days)
// ==========================================
export async function syncMLOrders() {
  try {
    const supabase = await createClient()
    const mlConnection = await getMLConnection()

    if (!mlConnection.success || !mlConnection.connected || !mlConnection.connection) {
      return { success: false, error: "No hay conexión a Mercado Libre." }
    }

    const { external_user_id, channel_id } = mlConnection.connection
    const access_token = await refreshMercadoLibreToken(mlConnection.connection)

    // Últimos 90 días
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - 90)
    // El formato de ML requiere milisegundos y timezone offset exacto, ej: 2023-01-01T00:00:00.000-00:00
    // toISOString() da "2023-01-01T00:00:00.000Z" que ML acepta.
    const dateFromStr = dateFrom.toISOString()

    let offset = 0
    const limit = 50
    let total = 1
    let syncedOrders = 0
    let syncedItems = 0

    // Para conciliación
    const { data: existingListings } = await supabase
      .from("channel_listings")
      .select("id, external_id, variant_id")
      .eq("channel_id", channel_id)

    const listingMap = new Map()
    if (existingListings) {
      for (const l of existingListings) {
        listingMap.set(l.external_id, { id: l.id, variant_id: l.variant_id })
      }
    }

    while (offset < total) {
      const url = `https://api.mercadolibre.com/orders/search?seller=${external_user_id}&order.date_created.from=${dateFromStr}&offset=${offset}&limit=${limit}`
      const ordersRes = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } })
      
      if (!ordersRes.ok) throw new Error("Error fetching ML orders: " + await ordersRes.text())
      
      const ordersBody = await ordersRes.json()
      total = ordersBody.paging?.total || 0
      
      const orders = ordersBody.results || []

      for (const order of orders) {
        const orderData = {
          order_id: String(order.id),
          total_amount: order.total_amount,
          status: order.status,
          date_created: order.date_created,
          buyer_id: String(order.buyer?.id || ""),
          synced_at: new Date().toISOString()
        }

        const { data: savedOrder, error: orderErr } = await supabase
          .from("ml_orders")
          .upsert(orderData, { onConflict: "order_id" })
          .select("id")
          .single()

        if (orderErr || !savedOrder) {
          console.error("Error upserting order", orderErr)
          continue
        }

        syncedOrders++

        // Borrar items existentes para esta orden
        await supabase.from("ml_order_items").delete().eq("order_id", savedOrder.id)

        // Insertar items
        for (const item of order.order_items) {
          const item_id = item.item.id
          const listingInfo = listingMap.get(item_id)
          
          await supabase.from("ml_order_items").insert({
            order_id: savedOrder.id,
            item_id: item_id,
            title: item.item.title,
            quantity: item.quantity,
            unit_price: item.unit_price,
            channel_listing_id: listingInfo ? listingInfo.id : null,
            variant_id: listingInfo ? listingInfo.variant_id : null
          })
          syncedItems++
        }
      }
      
      offset += limit
      if (offset >= total) break
    }

    revalidatePath("/integrations/mercadolibre")
    
    return {
      success: true,
      orders: syncedOrders,
      items: syncedItems
    }
  } catch (e: unknown) {
    console.error("Exception in syncMLOrders:", e)
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" }
  }
}
