/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { createClient } from "@/lib/supabase/server"
import slugify from "slugify"
import { revalidatePath } from "next/cache"

export interface CSVRow {
  Producto: string
  Variante: string
  SKU: string
  Costo: string
  Precio: string
  Stock: string
  Codigo_Barras: string
  Referencia_Externa: string
  Marca: string
  Categoria: string
  Estado: string
  URL_Imagen: string
  Activo: string
}

export interface ImportPreview {
  newProducts: number
  existingProducts: number
  newVariants: number
  updatedVariants: number
  errors: string[]
  parsedRows: any[]
}

function generateSlug(productName: string, brandName: string) {
  const base = brandName ? `${productName}-${brandName}` : productName
  return slugify(base, { lower: true, strict: true })
}

export async function processImportDryRun(rows: CSVRow[]): Promise<ImportPreview> {
  const supabase = await createClient()
  
  const preview: ImportPreview = {
    newProducts: 0,
    existingProducts: 0,
    newVariants: 0,
    updatedVariants: 0,
    errors: [],
    parsedRows: []
  }

  // Fetch all existing products and variants for fast in-memory comparison
  const [{ data: products }, { data: variants }] = await Promise.all([
    supabase.from("products").select("id, slug"),
    supabase.from("product_variants").select("id, sku")
  ])

  const existingProductSlugs = new Set((products || []).map(p => p.slug))
  const existingVariantSkus = new Set((variants || []).map(v => v.sku))
  
  const trackedNewProductSlugs = new Set<string>()
  const trackedNewVariantSkus = new Set<string>()

  for (const [index, row] of rows.entries()) {
    const rowNum = index + 2 // +1 for 0-index, +1 for header
    
    // Basic validations
    if (!row.Producto?.trim()) {
      preview.errors.push(`Fila ${rowNum}: El nombre del Producto es obligatorio.`)
      continue
    }
    if (!row.SKU?.trim()) {
      preview.errors.push(`Fila ${rowNum}: El SKU es obligatorio.`)
      continue
    }

    const slug = generateSlug(row.Producto.trim(), row.Marca?.trim() || "")
    const sku = row.SKU.trim()

    // Process Product
    if (existingProductSlugs.has(slug)) {
      if (!trackedNewProductSlugs.has(slug)) {
        preview.existingProducts++
        trackedNewProductSlugs.add(slug) // prevent recounting
      }
    } else {
      if (!trackedNewProductSlugs.has(slug)) {
        preview.newProducts++
        trackedNewProductSlugs.add(slug)
      }
    }

    // Process Variant
    if (existingVariantSkus.has(sku)) {
      if (!trackedNewVariantSkus.has(sku)) {
        preview.updatedVariants++
        trackedNewVariantSkus.add(sku)
      }
    } else {
      if (!trackedNewVariantSkus.has(sku)) {
        preview.newVariants++
        trackedNewVariantSkus.add(sku)
      } else {
        preview.errors.push(`Fila ${rowNum}: SKU duplicado dentro del mismo archivo (${sku}).`)
      }
    }
    
    preview.parsedRows.push({ ...row, _slug: slug })
  }

  return preview
}

export async function executeImport(rows: CSVRow[]) {
  console.log(`[Import] INIT - Filas recibidas: ${rows?.length || 0}`)
  
  if (!rows || rows.length === 0) {
    return { success: false, error: "No se recibieron filas." }
  }

  const supabase = await createClient()
  
  const stats = {
    productosNuevos: 0,
    productosActualizados: 0,
    variantesUpsertadas: 0,
    variantesFallidas: 0,
    errores: [] as string[]
  }
  
  // Agrupar filas por marca y categoría para insertarlas primero
  const brandsSet = new Set(rows.map(r => r.Marca?.trim()).filter(Boolean))
  const categoriesSet = new Set(rows.map(r => r.Categoria?.trim()).filter(Boolean))

  // 1. Resolve Brands
  const brandMap: Record<string, string> = {}
  for (const b of Array.from(brandsSet)) {
    const slug = slugify(b, { lower: true, strict: true })
    const { data } = await supabase.from("brands").select("id").eq("slug", slug).single()
    if (data) {
      brandMap[b] = data.id
    } else {
      const { data: newBrand } = await supabase.from("brands").insert({ name: b, slug }).select("id").single()
      if (newBrand) brandMap[b] = newBrand.id
    }
  }

  // 2. Resolve Categories
  const catMap: Record<string, string> = {}
  for (const c of Array.from(categoriesSet)) {
    const slug = slugify(c, { lower: true, strict: true })
    const { data } = await supabase.from("categories").select("id").eq("slug", slug).single()
    if (data) {
      catMap[c] = data.id
    } else {
      const { data: newCat } = await supabase.from("categories").insert({ name: c, slug }).select("id").single()
      if (newCat) catMap[c] = newCat.id
    }
  }

  // 3. Resolve Products
  // Obtenemos los productos existentes para hacer batch
  const { data: existingProducts } = await supabase.from("products").select("id, slug")
  const productMap: Record<string, string> = {}
  existingProducts?.forEach(p => { productMap[p.slug] = p.id })

  const uniqueProductsMap: Record<string, any> = {}
  rows.forEach(row => {
    if (!row.Producto?.trim() || !row.SKU?.trim()) return
    const slug = generateSlug(row.Producto.trim(), row.Marca?.trim() || "")
    if (!productMap[slug] && !uniqueProductsMap[slug]) {
      const fallbackBrandId = '5ee6ff65-5e90-4d10-a565-96860ae1045a'
      const assignedBrandId = row.Marca?.trim() ? (brandMap[row.Marca.trim()] || fallbackBrandId) : fallbackBrandId
      console.log(`[Import] Producto: ${row.Producto.trim()} | Marca detectada: ${row.Marca || 'Vacia'} | Brand ID asignado: ${assignedBrandId}`)

      uniqueProductsMap[slug] = {
        name: row.Producto.trim(),
        slug,
        brand_id: assignedBrandId,
        category_id: row.Categoria?.trim() ? catMap[row.Categoria.trim()] : null,
        active: true,
        sku: `PROD-${slug}`, // FASE TEMPORAL para evitar constraint NOT NULL
        cost: parseFloat(row.Costo) || 0,
        price: parseFloat(row.Precio) || 0,
        stock: parseInt(row.Stock, 10) || 0
      }
    }
  })

  const productsToInsert = Object.values(uniqueProductsMap)
  console.log(`[Import] STEP 3 - Número de productos únicos agrupados a insertar: ${productsToInsert.length}`)
  
  if (productsToInsert.length > 0) {
    console.log(`[Import] Primer producto a procesar:`, productsToInsert[0])
    
    for (const [index, prod] of productsToInsert.entries()) {
      if (index === 0) console.log(`[Import] Intentando upsert del primer producto: ${prod.name} (Slug: ${prod.slug})`)
      
      const { data: insertedProduct, error: pErr } = await supabase
        .from("products")
        .upsert(prod, { onConflict: "slug" })
        .select("id")
        .single()
        
      if (pErr) {
        console.error(`[Import] Error upserting product ${prod.name}:`, JSON.stringify(pErr))
        stats.errores.push(`Error producto ${prod.name}: ${pErr.message}`)
      } else if (insertedProduct) {
        if (index === 0) console.log(`[Import] Resultado exitoso del upsert del primer producto, ID Obtenido=${insertedProduct.id}`)
        productMap[prod.slug] = insertedProduct.id
        stats.productosNuevos++
      } else {
         console.warn(`[Import] Upsert sin error pero con data=null para ${prod.name}`)
         stats.errores.push(`Data null para producto ${prod.name}`)
      }
    }
  }

  // 4. Resolve Variants
  const validVariantsToUpsert = []
  
  for (const row of rows) {
    if (!row.Producto?.trim() || !row.SKU?.trim()) continue
    
    const slug = generateSlug(row.Producto.trim(), row.Marca?.trim() || "")
    const productId = productMap[slug]
    
    if (validVariantsToUpsert.length === 0) {
       console.log(`[Import] STEP 4 - Primera variante detectada: ${row.Producto} / ${row.Variante}. Slug buscado: ${slug}, product_id en cache: ${productId}`)
    }
    
    if (!productId) {
      if (validVariantsToUpsert.length === 0) console.error(`[Import] Error Crítico: product_id null para el primer producto ${row.Producto}`)
      stats.variantesFallidas++
      stats.errores.push(`Variante omitida: no se encontró product_id para ${row.Producto}`)
      continue
    }

    validVariantsToUpsert.push({
      product_id: productId,
      sku: row.SKU.trim(),
      name: row.Variante?.trim() || "Única",
      cost: parseFloat(row.Costo) || 0,
      price: parseFloat(row.Precio) || 0,
      stock: parseInt(row.Stock, 10) || 0,
      barcode: row.Codigo_Barras?.trim() || null,
      external_reference: row.Referencia_Externa?.trim() || null,
      image_url: row.URL_Imagen?.trim() || null,
      active: (row.Estado?.trim().toLowerCase() === "publicado" || row.Activo?.trim().toLowerCase() !== "no") ? true : false
    })
  }

  // Eliminar duplicados de SKU en el mismo lote si es que hay para evitar error
  const uniqueVariantsMap = new Map()
  for (const variant of validVariantsToUpsert) {
    if (!uniqueVariantsMap.has(variant.sku)) {
      uniqueVariantsMap.set(variant.sku, variant)
    }
  }

  if (uniqueVariantsMap.size > 0) {
    console.log(`[Import] Ejecutando Upsert final de ${uniqueVariantsMap.size} variantes...`)
    const { data: vData, error: vErr } = await supabase
      .from("product_variants")
      .upsert(Array.from(uniqueVariantsMap.values()), { onConflict: "sku" })
      .select("id")
    
    if (vErr) {
      console.error("[Import] Error upserting variants:", JSON.stringify(vErr))
      stats.errores.push("Error batch upsert variantes: " + vErr.message)
    } else if (vData) {
      console.log(`[Import] Importación de variantes completada exitosamente. Total devuelto: ${vData.length}`)
      stats.variantesUpsertadas = vData.length
    } else {
      console.warn(`[Import] Upsert de variantes devuelto con data null`)
      stats.errores.push("Batch upsert devolvió data null")
    }
  }

  console.log(`[Import] RESUMEN FINAL:
  Productos creados: ${stats.productosNuevos}
  Productos actualizados: ${stats.productosActualizados}
  Variantes creadas/actualizadas: ${stats.variantesUpsertadas}
  Variantes fallidas: ${stats.variantesFallidas}
  Errores detectados: ${stats.errores.length}
  `)

  revalidatePath("/products")
  return { success: stats.errores.length === 0, stats, error: stats.errores.join(" | ") }
}

export async function repairWooCommerceImages() {
  const supabase = await createClient()

  // 1. Obtener variantes CON imagen
  const { data: variantsWithImages, error: e1 } = await supabase
    .from("product_variants")
    .select("id, product_id, image_url")
    .not("image_url", "is", null)

  if (e1) return { success: false, error: e1.message }

  const productImages: Record<string, string> = {}
  const updates: { id: string, image_url: string }[] = []

  variantsWithImages?.forEach(v => {
    let finalUrl = v.image_url
    if (finalUrl && finalUrl.includes(",")) {
      // Tomar solo la primera imagen, el resto se ignora por ahora (galería futura)
      finalUrl = finalUrl.split(",")[0].trim()
      updates.push({ id: v.id, image_url: finalUrl })
    }
    
    // Guardar la primera imagen válida para heredar a sus hermanos
    if (finalUrl && !productImages[v.product_id]) {
      productImages[v.product_id] = finalUrl
    }
  })

  // 2. Obtener variantes SIN imagen
  const { data: variantsWithoutImages, error: e2 } = await supabase
    .from("product_variants")
    .select("id, product_id")
    .is("image_url", null)

  if (e2) return { success: false, error: e2.message }

  variantsWithoutImages?.forEach(v => {
    if (productImages[v.product_id]) {
      updates.push({
        id: v.id,
        image_url: productImages[v.product_id]
      })
    }
  })

  // 3. Ejecutar actualizaciones
  let successCount = 0
  if (updates.length > 0) {
    for (const update of updates) {
      const { error } = await supabase
        .from("product_variants")
        .update({ image_url: update.image_url })
        .eq("id", update.id)
        
      if (!error) successCount++
    }
  }

  revalidatePath("/products")
  return { success: true, repairedCount: successCount, totalDetected: updates.length }
}
