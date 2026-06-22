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
