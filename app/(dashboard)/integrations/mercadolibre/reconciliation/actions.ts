"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getReconciliationStats() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("channel_listings")
    .select("id, variant_id, last_sync_status")
    
  if (error || !data) {
    return { total: 0, linked: 0, pending: 0, error: 0, percentage: 0 }
  }

  const total = data.length
  const linked = data.filter(d => d.variant_id !== null).length
  const pending = data.filter(d => d.variant_id === null && d.last_sync_status !== "error").length
  const errors = data.filter(d => d.last_sync_status === "error" && d.variant_id === null).length
  
  const percentage = total > 0 ? Math.round((linked / total) * 100) : 0

  return { total, linked, pending, error: errors, percentage }
}

export async function getReconciliationListings(filter: string = "all", search: string = "") {
  const supabase = await createClient()
  
  let query = supabase
    .from("channel_listings")
    .select(`
      id,
      external_id,
      title,
      status,
      channel_sku,
      variant_id,
      last_sync_status,
      user_product_id,
      inventory_id,
      matched_at,
      product_variants (
        sku,
        products (
          name
        )
      )
    `)
    .order("updated_at", { ascending: false })

  if (filter === "linked") {
    query = query.not("variant_id", "is", null)
  } else if (filter === "pending") {
    query = query.is("variant_id", null).neq("last_sync_status", "error")
  } else if (filter === "error") {
    query = query.is("variant_id", null).eq("last_sync_status", "error")
  }
  
  if (search) {
    query = query.or(`title.ilike.%${search}%,external_id.ilike.%${search}%,channel_sku.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching reconciliation listings:", error)
    return []
  }

  return data
}

export async function getReconciliationSuggestions(mlTitle: string) {
  const supabase = await createClient()
  
  // Llamamos a la función RPC que crearemos en la migración SQL
  const { data, error } = await supabase.rpc("get_reconciliation_suggestions", {
    ml_title: mlTitle,
    match_limit: 3
  })

  if (error) {
    console.error("Error fetching suggestions:", error)
    return []
  }

  return data || []
}

export async function linkListingToVariant(listingId: string, variantId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("channel_listings")
    .update({
      variant_id: variantId,
      matched_at: new Date().toISOString(),
      last_sync_status: "success",
      sync_error: null
    })
    .eq("id", listingId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/integrations/mercadolibre/reconciliation")
  return { success: true }
}

export async function unlinkListing(listingId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("channel_listings")
    .update({
      variant_id: null,
      matched_at: null,
      last_sync_status: "error", // Vuelve a error porque le falta SKU/vínculo
      sync_error: "Unlinked manually"
    })
    .eq("id", listingId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/integrations/mercadolibre/reconciliation")
  return { success: true }
}
