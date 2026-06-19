"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import slugify from "slugify"

export interface ProductInput {
  sku: string
  name: string
  short_description: string
  description: string
  brand_id: string
  category_id: string
  cost: number
  price: number
  stock: number
}

export interface DimensionsInput {
  weight: number
  length: number
  width: number
  height: number
}

// Obtener todos los productos con filtros (Búsqueda por SKU/Nombre, Marca, Categoría, Estado)
export async function getProducts(filters?: {
  search?: string
  brand_id?: string
  category_id?: string
  active?: boolean
}) {
  const supabase = await createClient()
  let query = supabase
    .from("products")
    .select(`
      *,
      brands (id, name),
      categories (id, name)
    `)

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
  }
  if (filters?.brand_id && filters.brand_id !== "all") {
    query = query.eq("brand_id", filters.brand_id)
  }
  if (filters?.category_id && filters.category_id !== "all") {
    query = query.eq("category_id", filters.category_id)
  }
  if (typeof filters?.active === "boolean") {
    query = query.eq("active", filters.active)
  }

  // Ordenar por fecha de creación o nombre
  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching products:", error)
    return []
  }

  return data || []
}

// Obtener un producto por ID con sus dimensiones logísticas
export async function getProductById(id: string) {
  const supabase = await createClient()

  // 1. Obtener datos del producto
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single()

  if (productError) {
    console.error("Error fetching product details:", productError)
    return null
  }

  // 2. Obtener dimensiones logísticas
  const { data: dimensions } = await supabase
    .from("product_dimensions")
    .select("*")
    .eq("product_id", id)
    .single()

  // Si no hay dimensiones creadas, devolvemos valores por defecto
  const defaultDimensions = {
    weight: 0,
    length: 0,
    width: 0,
    height: 0
  }

  return {
    ...product,
    dimensions: dimensions || defaultDimensions
  }
}

// Crear un nuevo producto con dimensiones logísticas
export async function createProduct(
  productData: ProductInput,
  dimensionsData: DimensionsInput
) {
  const supabase = await createClient()
  const slug = slugify(productData.name, { lower: true, strict: true })

  // 1. Insertar el producto en 'products'
  const { data: product, error: productError } = await supabase
    .from("products")
    .insert([
      {
        sku: productData.sku,
        name: productData.name,
        slug,
        short_description: productData.short_description || null,
        description: productData.description || null,
        brand_id: productData.brand_id || null,
        category_id: productData.category_id || null,
        cost: productData.cost,
        price: productData.price,
        stock: productData.stock,
        active: true
      }
    ])
    .select()

  if (productError) {
    console.error("Error inserting product:", productError)
    throw new Error(productError.message)
  }

  const createdProduct = product[0]

  // 2. Insertar dimensiones logísticas en 'product_dimensions'
  const { error: dimsError } = await supabase
    .from("product_dimensions")
    .insert([
      {
        product_id: createdProduct.id,
        weight: dimensionsData.weight,
        length: dimensionsData.length,
        width: dimensionsData.width,
        height: dimensionsData.height
      }
    ])

  if (dimsError) {
    console.error("Error inserting product dimensions:", dimsError)
    // Nota: Aunque el producto se creó, si las dimensiones fallan mostramos el error
    throw new Error(`Producto creado, pero falló el registro logístico: ${dimsError.message}`)
  }

  revalidatePath("/products")
  revalidatePath("/") // Revalidar dashboard
  return createdProduct
}

// Actualizar un producto existente y sus dimensiones
export async function updateProduct(
  id: string,
  productData: ProductInput,
  dimensionsData: DimensionsInput
) {
  const supabase = await createClient()
  const slug = slugify(productData.name, { lower: true, strict: true })

  // 1. Actualizar en 'products'
  const { error: productError } = await supabase
    .from("products")
    .update({
      sku: productData.sku,
      name: productData.name,
      slug,
      short_description: productData.short_description || null,
      description: productData.description || null,
      brand_id: productData.brand_id || null,
      category_id: productData.category_id || null,
      cost: productData.cost,
      price: productData.price,
      stock: productData.stock
    })
    .eq("id", id)

  if (productError) {
    console.error("Error updating product:", productError)
    throw new Error(productError.message)
  }

  // 2. Actualizar o insertar en 'product_dimensions'
  // Verificamos si ya existen las dimensiones para este producto
  const { data: existingDims } = await supabase
    .from("product_dimensions")
    .select("id")
    .eq("product_id", id)
    .single()

  if (existingDims) {
    // Actualizar
    const { error: dimsError } = await supabase
      .from("product_dimensions")
      .update({
        weight: dimensionsData.weight,
        length: dimensionsData.length,
        width: dimensionsData.width,
        height: dimensionsData.height
      })
      .eq("product_id", id)

    if (dimsError) {
      console.error("Error updating dimensions:", dimsError)
      throw new Error(dimsError.message)
    }
  } else {
    // Si por alguna razón no existía, se inserta
    const { error: dimsError } = await supabase
      .from("product_dimensions")
      .insert([
        {
          product_id: id,
          weight: dimensionsData.weight,
          length: dimensionsData.length,
          width: dimensionsData.width,
          height: dimensionsData.height
        }
      ])

    if (dimsError) {
      console.error("Error inserting dimensions during update:", dimsError)
      throw new Error(dimsError.message)
    }
  }

  revalidatePath("/products")
  revalidatePath(`/products/${id}`)
  return { success: true }
}

// Cambiar estado activo/inactivo (Soft Delete de producto)
export async function toggleProductStatus(id: string, currentStatus: boolean) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("products")
    .update({ active: !currentStatus })
    .eq("id", id)
    .select()

  if (error) {
    console.error("Error toggling product status:", error)
    throw new Error(error.message)
  }

  revalidatePath("/products")
  revalidatePath("/") // Revalidar dashboard
  return data[0]
}
