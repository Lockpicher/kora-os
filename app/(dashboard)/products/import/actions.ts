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
  const supabase = await createClient()
  
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
      uniqueProductsMap[slug] = {
        name: row.Producto.trim(),
        slug,
        brand_id: row.Marca?.trim() ? brandMap[row.Marca.trim()] : null,
        category_id: row.Categoria?.trim() ? catMap[row.Categoria.trim()] : null,
        active: true
      }
    }
  })

  const productsToInsert = Object.values(uniqueProductsMap)
  if (productsToInsert.length > 0) {
    const { data: insertedProducts, error: pErr } = await supabase.from("products").insert(productsToInsert).select("id, slug")
    if (pErr) console.error("Error inserting products:", pErr)
    insertedProducts?.forEach(p => { productMap[p.slug] = p.id })
  }

  // 4. Resolve Variants
  const variantsToUpsert = rows.filter(r => r.Producto?.trim() && r.SKU?.trim()).map(row => {
    const slug = generateSlug(row.Producto.trim(), row.Marca?.trim() || "")
    const productId = productMap[slug]
    
    return {
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
    }
  })

  // Eliminar duplicados de SKU en el mismo lote si es que hay para evitar error
  const uniqueVariantsMap = new Map()
  for (const variant of variantsToUpsert) {
    if (!uniqueVariantsMap.has(variant.sku)) {
      uniqueVariantsMap.set(variant.sku, variant)
    }
  }

  if (uniqueVariantsMap.size > 0) {
    const { error: vErr } = await supabase
      .from("product_variants")
      .upsert(Array.from(uniqueVariantsMap.values()), { onConflict: "sku" })
    
    if (vErr) {
      console.error("Error upserting variants:", vErr)
      return { success: false, error: "Error insertando variantes: " + vErr.message }
    }
  }

  revalidatePath("/products")
  return { success: true }
}
