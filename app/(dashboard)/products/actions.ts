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
): Promise<{ success: boolean; error?: string; product?: unknown }> {
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
    if (productError.code === "23505" || productError.message?.includes("products_sku_key")) {
      return { success: false, error: "duplicate_sku" }
    }
    return { success: false, error: productError.message }
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
    return { success: false, error: `Producto creado, pero falló el registro logístico: ${dimsError.message}` }
  }

  revalidatePath("/products")
  revalidatePath("/") // Revalidar dashboard
  return { success: true, product: createdProduct }
}

// Actualizar un producto existente y sus dimensiones
export async function updateProduct(
  id: string,
  productData: ProductInput,
  dimensionsData: DimensionsInput
): Promise<{ success: boolean; error?: string }> {
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
    if (productError.code === "23505" || productError.message?.includes("products_sku_key")) {
      return { success: false, error: "duplicate_sku" }
    }
    return { success: false, error: productError.message }
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
      return { success: false, error: dimsError.message }
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
      return { success: false, error: dimsError.message }
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

// === FASE 2A: GESTIÓN DE IMÁGENES ===

export interface ProductImage {
  id: string
  product_id: string
  image_url: string
  sort_order: number
  created_at: string
  storage_path?: string
}

// Obtener todas las imágenes de un producto ordenadas por sort_order ASC
export async function getProductImages(
  productId: string
): Promise<{ success: boolean; images?: ProductImage[]; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("Error fetching product images:", error)
    return { success: false, error: error.message }
  }

  // Preparamos la arquitectura para almacenar y retornar también el storage_path
  const rawImages = (data || []) as { id: string; product_id: string; image_url: string; sort_order: number; created_at: string }[]
  const images = rawImages.map((img) => {
    let storage_path = ""
    try {
      const parts = img.image_url.split("/public/products/")
      if (parts.length > 1) {
        storage_path = parts[1]
      }
    } catch (e) {
      console.error("Error parsing storage_path from image_url:", e)
    }
    return {
      ...img,
      storage_path
    } as ProductImage
  })

  return { success: true, images }
}

// Subir múltiples imágenes a Supabase Storage y registrarlas en product_images
export async function uploadProductImages(
  productId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)

  console.log("KEY TYPE:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "ANON_KEY" : "PUBLISHABLE_KEY")

  const keyToUse = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""
  console.log("KEY PREFIX:", keyToUse.substring(0, 20))

  const bucketsRaw = await supabase.storage.listBuckets()
  console.log("LIST_BUCKETS RAW:", bucketsRaw)

  const bucket = await supabase.storage.getBucket("products")
  console.log("GET_BUCKET:", JSON.stringify(bucket, null, 2))

  // 1. Verificar existencia del bucket "products" (sin intentar crearlo, mostrando error amigable si no existe)
  const { error: bucketError } = await supabase.storage.getBucket("products")
  if (bucketError) {
    const err = bucketError as { status?: number; statusCode?: string; message?: string }
    // Si el error indica explícitamente que no se encontró el bucket (404), retornamos un error amigable.
    if (err.status === 404 || err.statusCode === "404" || err.message?.toLowerCase().includes("not found")) {
      return {
        success: false,
        error: "El almacenamiento de imágenes ('products') no está configurado en Supabase. Por favor, créalo en la consola de Supabase antes de continuar."
      }
    }
    // Si es otro tipo de error (ej: 403 Forbidden por permisos restrictivos de la anon key),
    // registramos una advertencia en la consola e intentamos continuar con la subida.
    console.warn("Advertencia al validar la existencia del bucket 'products':", bucketError.message)
  }

  const files = formData.getAll("files") as File[]
  if (!files || files.length === 0) {
    return { success: false, error: "No se seleccionaron archivos para subir." }
  }

  // 2. Validar formatos y tamaño de archivos (máximo 10 MB por archivo)
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: `El archivo ${file.name} excede el límite de tamaño permitido de 10 MB.` }
    }
    if (!allowedTypes.includes(file.type.toLowerCase()) && !file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      return { success: false, error: `Formato de archivo no soportado para ${file.name}. Usa JPG, PNG o WEBP.` }
    }
  }

  // 3. Obtener el sort_order inicial para la secuencia
  const { data: currentImages } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })

  let nextSortOrder = 0
  if (currentImages && currentImages.length > 0) {
    nextSortOrder = currentImages[0].sort_order + 1
  }

  // 4. Subir y registrar secuencialmente
  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const timestamp = Date.now()
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
      const storagePath = `${productId}/${timestamp}-${cleanName}`

      // Subir archivo al bucket "products"
      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(storagePath, buffer, {
          contentType: file.type || "image/jpeg",
          upsert: true
        })

      if (uploadError) {
        console.error("Error uploading to storage:", uploadError)
        const err = uploadError as { status?: number; statusCode?: string; message?: string }
        if (err.status === 404 || err.statusCode === "404" || err.message?.toLowerCase().includes("not found")) {
          return {
            success: false,
            error: "El almacenamiento de imágenes ('products') no está configurado en Supabase. Por favor, créalo en la consola de Supabase antes de continuar."
          }
        }
        return { success: false, error: `Fallo al subir el archivo ${file.name} a Supabase Storage.` }
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("products")
        .getPublicUrl(storagePath)

      // Registrar en la base de datos (arquitectura preparada para storage_path)
      const insertPayload: {
        product_id: string
        image_url: string
        sort_order: number
        storage_path?: string
      } = {
        product_id: productId,
        image_url: publicUrl,
        sort_order: nextSortOrder,
        // storage_path: storagePath // Descomentar cuando la columna exista en la tabla de la BD
      }

      const { error: dbError } = await supabase
        .from("product_images")
        .insert([insertPayload])

      if (dbError) {
        console.error("Error saving image to DB:", dbError)
        // Limpiar el archivo en storage en caso de fallo en BD
        await supabase.storage.from("products").remove([storagePath])
        return { success: false, error: `Error al registrar la imagen ${file.name} en la base de datos.` }
      }

      nextSortOrder++
    } catch (e) {
      console.error("Exception during file upload:", e)
      return { success: false, error: `Ocurrió un error inesperado al procesar ${file.name}.` }
    }
  }

  revalidatePath(`/products/${productId}`)
  return { success: true }
}

// Eliminar imagen física del Storage y registro en la base de datos
export async function deleteProductImage(
  imageId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 1. Obtener los datos del registro de la imagen
  const { data: image, error: fetchError } = await supabase
    .from("product_images")
    .select("*")
    .eq("id", imageId)
    .single()

  if (fetchError || !image) {
    console.error("Error fetching image for deletion:", fetchError)
    return { success: false, error: "No se encontró el registro de la imagen a eliminar." }
  }

  const productId = image.product_id
  const imageUrl = image.image_url

  // 2. Extraer el storage_path de la URL
  let storagePath = ""
  try {
    const parts = imageUrl.split("/public/products/")
    if (parts.length > 1) {
      storagePath = parts[1]
    }
  } catch (e) {
    console.error("Error parsing storage path:", e)
  }

  if (storagePath) {
    // 3. Eliminar archivo físico de Supabase Storage
    const { error: removeError } = await supabase.storage
      .from("products")
      .remove([storagePath])

    if (removeError) {
      console.error("Error removing physical file:", removeError)
      // Continuamos de todas formas
    }
  }

  // 4. Eliminar el registro en la base de datos
  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId)

  if (deleteError) {
    console.error("Error deleting image from DB:", deleteError)
    return { success: false, error: "Error al eliminar el registro de la imagen." }
  }

  // 5. Re-indexar las imágenes restantes consecutivamente desde 0
  const { data: remaining, error: reindexFetchError } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })

  if (!reindexFetchError && remaining && remaining.length > 0) {
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].sort_order !== i) {
        await supabase
          .from("product_images")
          .update({ sort_order: i })
          .eq("id", remaining[i].id)
      }
    }
  }

  revalidatePath(`/products/${productId}`)
  return { success: true }
}

// Reordenar imágenes (mover hacia arriba o abajo intercambiando sort_order)
export async function reorderProductImages(
  imageId: string,
  direction: "up" | "down"
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 1. Obtener la imagen seleccionada
  const { data: image, error: fetchError } = await supabase
    .from("product_images")
    .select("*")
    .eq("id", imageId)
    .single()

  if (fetchError || !image) {
    console.error("Error fetching image for reordering:", fetchError)
    return { success: false, error: "No se encontró el registro de la imagen." }
  }

  const productId = image.product_id
  const currentOrder = image.sort_order

  // 2. Buscar la imagen con la que intercambiar el orden
  let query = supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)

  if (direction === "up") {
    query = query.lt("sort_order", currentOrder).order("sort_order", { ascending: false })
  } else {
    query = query.gt("sort_order", currentOrder).order("sort_order", { ascending: true })
  }

  const { data: candidates, error: swapFetchError } = await query.limit(1)

  if (swapFetchError || !candidates || candidates.length === 0) {
    // Si no hay candidatos, ya está en el límite
    return { success: true }
  }

  const swapImage = candidates[0]
  const targetOrder = swapImage.sort_order

  // 3. Actualizar la de intercambio a la posición actual
  const { error: updateSwapError } = await supabase
    .from("product_images")
    .update({ sort_order: currentOrder })
    .eq("id", swapImage.id)

  if (updateSwapError) {
    console.error("Error updating swap image order:", updateSwapError)
    return { success: false, error: "Error al actualizar el orden de las imágenes." }
  }

  // 4. Actualizar la actual a la posición de intercambio
  const { error: updateCurrentError } = await supabase
    .from("product_images")
    .update({ sort_order: targetOrder })
    .eq("id", image.id)

  if (updateCurrentError) {
    console.error("Error updating current image order:", updateCurrentError)
    return { success: false, error: "Error al actualizar el orden de la imagen seleccionada." }
  }

  revalidatePath(`/products/${productId}`)
  return { success: true }
}

// Establecer una imagen como principal (sort_order = 0 y desplazar el resto)
export async function setAsMainProductImage(
  imageId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 1. Obtener la imagen elegida
  const { data: mainImage, error: fetchError } = await supabase
    .from("product_images")
    .select("*")
    .eq("id", imageId)
    .single()

  if (fetchError || !mainImage) {
    console.error("Error fetching image to set as main:", fetchError)
    return { success: false, error: "No se encontró el registro de la imagen." }
  }

  const productId = mainImage.product_id

  // 2. Obtener todas las imágenes de este producto
  const { data: allImages, error: fetchAllError } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })

  if (fetchAllError || !allImages || allImages.length === 0) {
    return { success: false, error: "Error al recuperar las imágenes del producto." }
  }

  // Filtrar la seleccionada y ordenarlas
  const remainingImages = allImages.filter((img) => img.id !== imageId)

  // 3. Asignar sort_order = 0 a la seleccionada
  const { error: mainUpdateError } = await supabase
    .from("product_images")
    .update({ sort_order: 0 })
    .eq("id", imageId)

  if (mainUpdateError) {
    console.error("Error setting main image:", mainUpdateError)
    return { success: false, error: "Error al establecer la imagen como principal." }
  }

  // 4. Asignar sort_orders incrementales consecutivos (1, 2, ... N-1) a las restantes
  for (let i = 0; i < remainingImages.length; i++) {
    const { error: updateError } = await supabase
      .from("product_images")
      .update({ sort_order: i + 1 })
      .eq("id", remainingImages[i].id)

    if (updateError) {
      console.error("Error updating sort order for remaining image:", updateError)
    }
  }

  revalidatePath(`/products/${productId}`)
  return { success: true }
}
