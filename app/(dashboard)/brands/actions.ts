"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import slugify from "slugify"

// Obtener todas las marcas (incluyendo las inactivas)
export async function getBrands() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching brands:", error)
    return []
  }

  return data || []
}

// Crear una nueva marca
export async function createBrand(name: string) {
  const supabase = await createClient()
  const slug = slugify(name, { lower: true, strict: true })

  const { data, error } = await supabase
    .from("brands")
    .insert([{ name, slug, active: true }])
    .select()

  if (error) {
    console.error("Error creating brand:", error)
    throw new Error(error.message)
  }

  revalidatePath("/brands")
  revalidatePath("/") // Revalidar dashboard
  return data[0]
}

// Actualizar una marca existente
export async function updateBrand(id: string, name: string) {
  const supabase = await createClient()
  const slug = slugify(name, { lower: true, strict: true })

  const { data, error } = await supabase
    .from("brands")
    .update({ name, slug })
    .eq("id", id)
    .select()

  if (error) {
    console.error("Error updating brand:", error)
    throw new Error(error.message)
  }

  revalidatePath("/brands")
  return data[0]
}

// Cambiar estado activo/inactivo (Soft Delete)
export async function toggleBrandStatus(id: string, currentStatus: boolean) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("brands")
    .update({ active: !currentStatus })
    .eq("id", id)
    .select()

  if (error) {
    console.error("Error toggling brand status:", error)
    throw new Error(error.message)
  }

  revalidatePath("/brands")
  revalidatePath("/") // Revalidar dashboard
  return data[0]
}
