"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function scanGarbageProducts() {
  const supabase = await createClient()

  // Find placeholders
  const { data: placeholders } = await supabase
    .from("products")
    .select("id, name")
    .ilike("name", "%Import placeholder%")

  // Find all products to filter demo
  const { data: allProducts } = await supabase
    .from("products")
    .select(`
      id, 
      name,
      categories (
        name
      )
    `)

  const razziKeywords = ["kids", "shoe", "women", "men", "fashion", "bag", "clothing", "hoodie", "t-shirt", "ropa", "zapato", "bolso", "moda"]

  const demoProducts = []
  
  if (allProducts) {
    for (const p of allProducts) {
      if (p.name.toLowerCase().includes("import placeholder")) continue 
      
      let isDemo = false
      // Handle the relation (could be an object or array)
      const cats = Array.isArray(p.categories) ? p.categories : [p.categories]
      const catName = cats.map(c => c?.name?.toLowerCase() || "").join(" ")
      
      if (catName && razziKeywords.some(kw => catName.includes(kw))) {
        isDemo = true
      }
      
      if (p.name.toLowerCase().includes("razzi") || p.name.toLowerCase().includes("demo")) {
        isDemo = true
      }
      
      if (isDemo) {
        demoProducts.push({ id: p.id, name: p.name, category: catName })
      }
    }
  }

  const placeholderIds = placeholders?.map(p => p.id) || []
  const demoIds = demoProducts.map(d => d.id)
  const garbageIds = [...placeholderIds, ...demoIds]

  let variantsCount = 0
  if (garbageIds.length > 0) {
    const { count } = await supabase
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .in("product_id", garbageIds)
    
    variantsCount = count || 0
  }

  return {
    placeholders: placeholders || [],
    demoProducts,
    variantsCount,
    totalGarbageIds: garbageIds
  }
}

export async function executeCleanup(productIds: string[]) {
  if (!productIds || productIds.length === 0) return { success: true }

  const supabase = await createClient()

  // 1. Delete variants first to avoid FK constraint violations
  const { error: vErr } = await supabase
    .from("product_variants")
    .delete()
    .in("product_id", productIds)

  if (vErr) {
    console.error("Error deleting variants:", vErr)
    return { success: false, error: "Error variantes: " + vErr.message }
  }

  // 2. Delete products
  const { error: pErr } = await supabase
    .from("products")
    .delete()
    .in("id", productIds)

  if (pErr) {
    console.error("Error deleting products:", pErr)
    return { success: false, error: "Error productos: " + pErr.message }
  }

  revalidatePath("/products")
  return { success: true }
}
