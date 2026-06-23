/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// 1. Configuración de credenciales

export async function getWooCommerceConfig() {
  const supabase = await createClient()

  const { data: channel } = await supabase
    .from("sales_channels")
    .select("id")
    .eq("code", "WC")
    .single()

  if (!channel) return { success: false, error: "Canal WooCommerce no encontrado en sales_channels" }

  const { data: connection } = await supabase
    .from("channel_connections")
    .select("*")
    .eq("channel_id", channel.id)
    .single()

  if (!connection) {
    return { success: true, data: null, channelId: channel.id }
  }

  return { success: true, data: connection, channelId: channel.id }
}

export async function saveWooCommerceConfig(storeUrl: string, consumerKey: string, consumerSecret: string) {
  const supabase = await createClient()

  const { data: channel } = await supabase
    .from("sales_channels")
    .select("id")
    .eq("code", "WC")
    .single()

  let channelId = channel?.id

  if (!channelId) {
    // Si no existe lo creamos
    const { data: newChannel, error: errChannel } = await supabase
      .from("sales_channels")
      .insert({ name: "WooCommerce", code: "WC", active: true })
      .select("id")
      .single()
    if (errChannel) return { success: false, error: "Error creando canal WC: " + errChannel.message }
    channelId = newChannel.id
  }

  const credentials = {
    store_url: storeUrl.replace(/\/$/, ""), // remove trailing slash
    consumer_key: consumerKey,
    consumer_secret: consumerSecret
  }

  const { data: existingConnection } = await supabase
    .from("channel_connections")
    .select("id")
    .eq("channel_id", channelId)
    .single()

  if (existingConnection) {
    const { error } = await supabase
      .from("channel_connections")
      .update({ credentials, active: true, updated_at: new Date().toISOString() })
      .eq("id", existingConnection.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase
      .from("channel_connections")
      .insert({
        channel_id: channelId,
        credentials,
        active: true
      })
    if (error) return { success: false, error: error.message }
  }

  revalidatePath("/integrations")
  revalidatePath("/integrations/woocommerce")
  return { success: true }
}

export async function testWooCommerceConnection() {
  const configRes = await getWooCommerceConfig()
  if (!configRes.success || !configRes.data) {
    return { success: false, error: "No hay configuración guardada" }
  }

  const { store_url, consumer_key, consumer_secret } = configRes.data.credentials

  try {
    const token = Buffer.from(`${consumer_key}:${consumer_secret}`).toString("base64")
    const url = `${store_url}/wp-json/wc/v3/system_status`

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${token}`,
        "Content-Type": "application/json"
      }
    })

    if (!res.ok) {
      const errText = await res.text()
      return { success: false, error: `HTTP Error ${res.status}: ${errText}` }
    }

    const data = await res.json()
    return { success: true, message: `Conexión exitosa. Versión WC: ${data.environment?.version || 'Desconocida'}` }
  } catch (e: any) {
    return { success: false, error: "Error de red: " + e.message }
  }
}

// 2. Lógica de Publicación y Sincronización
export async function syncProductToWooCommerce(productId: string) {
  const supabase = await createClient()

  // 1. Obtener config
  const configRes = await getWooCommerceConfig()
  if (!configRes.success || !configRes.data) return { success: false, error: "WooCommerce no está configurado." }
  
  const { store_url, consumer_key, consumer_secret } = configRes.data.credentials
  const channelId = configRes.channelId
  const token = Buffer.from(`${consumer_key}:${consumer_secret}`).toString("base64")
  
  const headers = {
    "Authorization": `Basic ${token}`,
    "Content-Type": "application/json"
  }

  // 2. Obtener el producto KORA
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("*, categories(name), brands(name)")
    .eq("id", productId)
    .single()

  if (pErr || !product) return { success: false, error: "Producto no encontrado." }

  // Helper para Sincronizar Categorías en WooCommerce
  async function syncWooCommerceCategory(categoryName: string): Promise<number | null> {
    try {
      // 1. Buscar si existe la categoría
      const searchRes = await fetch(`${store_url}/wp-json/wc/v3/products/categories?search=${encodeURIComponent(categoryName)}`, { headers })
      if (searchRes.ok) {
        const found = await searchRes.json()
        const exactMatch = found.find((c: any) => c.name.toLowerCase() === categoryName.toLowerCase())
        if (exactMatch) return exactMatch.id
      }

      // 2. Si no existe, crearla
      const createRes = await fetch(`${store_url}/wp-json/wc/v3/products/categories`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: categoryName })
      })
      if (createRes.ok) {
        const created = await createRes.json()
        return created.id
      }
    } catch (e) {
      console.error("Error sincronizando categoría en WC:", e)
    }
    return null
  }

  // 3. Obtener variantes activas
  // Diagnóstico
  const { data: diagVariants } = await supabase
    .from("product_variants")
    .select("id, active")
    .eq("product_id", productId)

  const { data: variants } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .eq("active", true)

  // 4. Determinar tipo y preparar payload base
  const isSimple = variants?.length === 1
  const isLegacySimple = !variants || variants.length === 0
  const isSimpleType = isLegacySimple || isSimple

  const basePayload: any = {
    name: product.name,
    status: product.active ? "publish" : "draft",
    type: isSimpleType ? "simple" : "variable"
  }

  // 5. Categorías
  let assignedCategoryName = "Ninguna"
  let wcCategoryId = null
  const catName = product.categories ? (product.categories as any).name : null
  
  if (catName) {
    wcCategoryId = await syncWooCommerceCategory(catName)
    if (wcCategoryId) {
      basePayload.categories = [{ id: wcCategoryId }]
      assignedCategoryName = catName
    }
  }

  // Variables para Diagnóstico de Retorno
  let imagesSentCount = 0

  if (isSimpleType) {
    if (isLegacySimple) {
      basePayload.regular_price = (product as any).price ? (product as any).price.toString() : "0"
      basePayload.sku = (product as any).sku || `PROD-${product.slug || productId.substring(0, 6)}`
      basePayload.manage_stock = true
      basePayload.stock_quantity = (product as any).stock || 0
      if ((product as any).image_url) {
        basePayload.images = [{ src: (product as any).image_url }]
        imagesSentCount++
      }
    } else {
      const v = variants[0]
      basePayload.regular_price = v.price ? v.price.toString() : "0"
      basePayload.sku = v.sku
      basePayload.manage_stock = true
      basePayload.stock_quantity = v.stock || 0
      if (v.image_url) {
        basePayload.images = [{ src: v.image_url }]
        imagesSentCount++
      }
    }
  } else {
    // Es Variable. Necesita un atributo para las variaciones.
    basePayload.attributes = [
      {
        name: "Variante",
        position: 0,
        visible: true,
        variation: true,
        options: variants.map(v => v.name)
      }
    ]
    // Imagen principal del producto padre (usamos la primera variante o producto)
    const parentImage = (product as any).image_url || variants.find(v => v.image_url)?.image_url
    if (parentImage) {
      basePayload.images = [{ src: parentImage }]
      imagesSentCount++
    }
  }

  const variantsIds = variants ? variants.map(v => v.id) : []
  let existingListings: any[] = []
  
  if (isLegacySimple) {
    const { data: prodListings } = await supabase
      .from("channel_listings")
      .select("*")
      .eq("channel_id", channelId)
      .eq("user_product_id", productId)
    existingListings = prodListings || []
  } else {
    const { data: varListings } = await supabase
      .from("channel_listings")
      .select("*")
      .eq("channel_id", channelId)
      .in("variant_id", variantsIds)
    existingListings = varListings || []
  }

  // Si existe un listing, tomamos el product_id de WooCommerce del source_data
  let wooProductId = null
  let method = "POST"
  let endpoint = `${store_url}/wp-json/wc/v3/products`

  const existingParentListing = existingListings?.find(l => l.source_data?.woocommerce_product_id)
  if (existingParentListing) {
    wooProductId = existingParentListing.source_data.woocommerce_product_id
    method = "PUT"
    endpoint = `${store_url}/wp-json/wc/v3/products/${wooProductId}`
  }

  try {
    // Upsert Producto Padre (o Simple)
    const res = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify(basePayload)
    })

    if (!res.ok) {
      const errText = await res.text()
      return { success: false, error: `Error WooCommerce API (Product): ${errText}` }
    }

    const wooProduct = await res.json()
    wooProductId = wooProduct.id

    // Si es Simple, guardamos/actualizamos su único listing y terminamos
    if (isSimpleType) {
      const sourceData = {
        woocommerce_product_id: wooProduct.id,
        woocommerce_variation_id: null,
        woocommerce_permalink: wooProduct.permalink
      }
      
      let existing
      if (isLegacySimple) {
        existing = existingListings?.find(l => l.user_product_id === productId)
      } else {
        existing = existingListings?.find(l => l.variant_id === variants[0].id)
      }
      
      if (existing) {
        await supabase.from("channel_listings").update({
          external_id: wooProduct.id.toString(),
          permalink: wooProduct.permalink,
          status: wooProduct.status,
          source_data: sourceData,
          synced_at: new Date().toISOString()
        }).eq("id", existing.id)
      } else {
        const insertData: any = {
          channel_id: channelId,
          external_id: wooProduct.id.toString(),
          permalink: wooProduct.permalink,
          status: wooProduct.status,
          source_data: sourceData
        }
        if (isLegacySimple) {
          insertData.user_product_id = productId
        } else {
          insertData.variant_id = variants[0].id
        }
        await supabase.from("channel_listings").insert(insertData)
      }

    } else {
      // Es Variable, procesar las variaciones hijas
      for (const v of variants) {
        const variationPayload: any = {
          regular_price: v.price ? v.price.toString() : "0",
          sku: v.sku,
          manage_stock: true,
          stock_quantity: v.stock || 0,
          attributes: [
            { name: "Variante", option: v.name }
          ]
        }
        if (v.image_url) {
          variationPayload.image = { src: v.image_url }
          imagesSentCount++
        }

        const existingVarListing = existingListings?.find(l => l.variant_id === v.id)
        let varMethod = "POST"
        let varEndpoint = `${store_url}/wp-json/wc/v3/products/${wooProductId}/variations`
        
        if (existingVarListing && existingVarListing.source_data?.woocommerce_variation_id) {
          varMethod = "PUT"
          varEndpoint = `${store_url}/wp-json/wc/v3/products/${wooProductId}/variations/${existingVarListing.source_data.woocommerce_variation_id}`
        }

        const varRes = await fetch(varEndpoint, {
          method: varMethod,
          headers,
          body: JSON.stringify(variationPayload)
        })

        if (!varRes.ok) {
           console.error(`Error WooCommerce API (Variation ${v.sku}):`, await varRes.text())
           continue // Skip si falla una, o podemos abortar
        }

        const wooVariation = await varRes.json()

        const varSourceData = {
          woocommerce_product_id: wooProductId,
          woocommerce_variation_id: wooVariation.id,
          woocommerce_permalink: wooVariation.permalink
        }

        if (existingVarListing) {
          await supabase.from("channel_listings").update({
            external_id: wooVariation.id.toString(),
            permalink: wooVariation.permalink,
            status: wooVariation.status,
            source_data: varSourceData,
            synced_at: new Date().toISOString()
          }).eq("id", existingVarListing.id)
        } else {
          await supabase.from("channel_listings").insert({
            variant_id: v.id,
            channel_id: channelId,
            external_id: wooVariation.id.toString(),
            permalink: wooVariation.permalink,
            status: wooVariation.status,
            source_data: varSourceData
          })
        }
      }
    }

    revalidatePath("/products")
    revalidatePath(`/products/${productId}`)
    
    return { 
      success: true, 
      message: `Sincronizado exitosamente: ${product.name}\n\nDetalles:\n- Tipo: ${isSimpleType ? 'Simple' : 'Variable'}\n- Product ID WC: ${wooProductId}\n- Categoría: ${assignedCategoryName}\n- Imágenes enviadas: ${imagesSentCount}` 
    }

  } catch (e: any) {
    return { success: false, error: "Error de ejecución: " + e.message }
  }
}

// 3. Obtener el estado actual de publicación
export async function getWooCommerceListingStatus(productId: string) {
  const supabase = await createClient()
  
  // Encontrar el canal WC
  const { data: channel } = await supabase.from("sales_channels").select("id").eq("code", "WC").single()
  if (!channel) return { isPublished: false, permalink: null }

  // Encontrar variantes del producto
  const { data: variants } = await supabase.from("product_variants").select("id").eq("product_id", productId)
  const isLegacySimple = !variants || variants.length === 0

  // Buscar listings
  let listings = []
  if (isLegacySimple) {
    const { data: prodListings } = await supabase.from("channel_listings")
      .select("permalink")
      .eq("channel_id", channel.id)
      .eq("user_product_id", productId)
      .not("permalink", "is", null)
      .limit(1)
    listings = prodListings || []
  } else {
    const { data: varListings } = await supabase.from("channel_listings")
      .select("permalink")
      .eq("channel_id", channel.id)
      .in("variant_id", variants.map(v => v.id))
      .not("permalink", "is", null)
      .limit(1)
    listings = varListings || []
  }

  if (listings && listings.length > 0 && listings[0].permalink) {
    return { isPublished: true, permalink: listings[0].permalink }
  }

  return { isPublished: false, permalink: null }
}


