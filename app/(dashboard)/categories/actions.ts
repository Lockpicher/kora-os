"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import slugify from "slugify"

// Obtener todas las categorías
export async function getCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching categories:", error)
    return []
  }

  return data || []
}

// Crear una nueva categoría
export async function createCategory(name: string, parentId: string | null) {
  const supabase = await createClient()
  const slug = slugify(name, { lower: true, strict: true })

  // Si parentId es vacío/string "null", guardamos como null real
  const finalParentId = parentId === "null" || !parentId ? null : parentId

  const { data, error } = await supabase
    .from("categories")
    .insert([{ name, slug, parent_id: finalParentId, active: true }])
    .select()

  if (error) {
    console.error("Error creating category:", error)
    throw new Error(error.message)
  }

  revalidatePath("/categories")
  revalidatePath("/") // Revalidar dashboard
  return data[0]
}

// Actualizar una categoría existente
export async function updateCategory(id: string, name: string, parentId: string | null) {
  const supabase = await createClient()
  const slug = slugify(name, { lower: true, strict: true })

  const finalParentId = parentId === "null" || !parentId ? null : parentId

  const { data, error } = await supabase
    .from("categories")
    .update({ name, slug, parent_id: finalParentId })
    .eq("id", id)
    .select()

  if (error) {
    console.error("Error updating category:", error)
    throw new Error(error.message)
  }

  revalidatePath("/categories")
  return data[0]
}

// Cambiar estado activo/inactivo (Soft Delete)
export async function toggleCategoryStatus(id: string, currentStatus: boolean) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("categories")
    .update({ active: !currentStatus })
    .eq("id", id)
    .select()

  if (error) {
    console.error("Error toggling category status:", error)
    throw new Error(error.message)
  }

  revalidatePath("/categories")
  revalidatePath("/") // Revalidar dashboard
  return data[0]
}
