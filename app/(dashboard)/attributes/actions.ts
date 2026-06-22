"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import slugify from "slugify"

export interface AttributeDefinition {
  id: string
  category_id: string
  name: string
  slug: string
  data_type: "text" | "textarea" | "number" | "boolean" | "select"
  required: boolean
  sort_order: number
  active: boolean
  created_at?: string
  updated_at?: string
}

export interface AttributeOption {
  id: string
  attribute_definition_id: string
  value: string
  sort_order: number
  active: boolean
  created_at?: string
  updated_at?: string
}

export interface AttributeInput {
  category_id: string
  name: string
  data_type: "text" | "textarea" | "number" | "boolean" | "select"
  required: boolean
  sort_order: number
}

// Obtener todas las definiciones de atributos con el nombre de su categoría
export async function getAttributeDefinitions(): Promise<{
  success: boolean
  attributes?: (AttributeDefinition & { categories: { name: string } | null })[]
  error?: string
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("attribute_definitions")
    .select(`
      *,
      categories (id, name)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching attribute definitions:", error)
    return { success: false, error: error.message }
  }

  return { success: true, attributes: data || [] }
}

// Obtener definiciones de atributos activos para una categoría específica
export async function getAttributeDefinitionsByCategory(
  categoryId: string
): Promise<{ success: boolean; attributes?: AttributeDefinition[]; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("attribute_definitions")
    .select("*")
    .eq("category_id", categoryId)
    .eq("active", true)
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("Error fetching attribute definitions by category:", error)
    return { success: false, error: error.message }
  }

  return { success: true, attributes: data || [] }
}

// Obtener todas las opciones activas de un atributo ordenadas por sort_order
export async function getAttributeOptions(
  attributeDefinitionId: string
): Promise<{ success: boolean; options?: AttributeOption[]; error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("attribute_options")
    .select("*")
    .eq("attribute_definition_id", attributeDefinitionId)
    .eq("active", true)
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("Error fetching attribute options:", error)
    return { success: false, error: error.message }
  }

  return { success: true, options: data || [] }
}

// Crear una nueva definición de atributo y sus opciones
export async function createAttributeDefinition(
  input: AttributeInput,
  options: string[]
): Promise<{ success: boolean; error?: string; attribute?: unknown }> {
  const supabase = await createClient()
  const slug = slugify(input.name, { lower: true, strict: true })

  // 1. Insertar definición en 'attribute_definitions'
  const { data: insertedData, error: insertError } = await supabase
    .from("attribute_definitions")
    .insert([
      {
        category_id: input.category_id,
        name: input.name,
        slug,
        data_type: input.data_type,
        required: input.required,
        sort_order: input.sort_order,
        active: true
      }
    ])
    .select()

  if (insertError || !insertedData || insertedData.length === 0) {
    console.error("Error inserting attribute definition:", insertError)
    return { success: false, error: insertError?.message || "No se pudo crear el atributo." }
  }

  const createdDef = insertedData[0]

  // 2. Si es de tipo select, guardar opciones en 'attribute_options'
  if (input.data_type === "select" && options && options.length > 0) {
    const optionsPayload = options
      .map((val) => val.trim())
      .filter(Boolean)
      .map((val, idx) => ({
        attribute_definition_id: createdDef.id,
        value: val,
        sort_order: idx,
        active: true
      }))

    if (optionsPayload.length > 0) {
      const { error: optionsError } = await supabase
        .from("attribute_options")
        .insert(optionsPayload)

      if (optionsError) {
        console.error("Error inserting attribute options:", optionsError)
        // Limpiamos el atributo insertado en caso de fallo en opciones
        await supabase.from("attribute_definitions").delete().eq("id", createdDef.id)
        return { success: false, error: `Error al registrar las opciones: ${optionsError.message}` }
      }
    }
  }

  revalidatePath("/attributes")
  revalidatePath("/categories")
  return { success: true, attribute: createdDef }
}

// Actualizar un atributo y refrescar sus opciones
export async function updateAttributeDefinition(
  id: string,
  input: AttributeInput,
  options: string[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const slug = slugify(input.name, { lower: true, strict: true })

  // 1. Actualizar definición del atributo
  const { error: updateError } = await supabase
    .from("attribute_definitions")
    .update({
      category_id: input.category_id,
      name: input.name,
      slug,
      data_type: input.data_type,
      required: input.required,
      sort_order: input.sort_order
    })
    .eq("id", id)

  if (updateError) {
    console.error("Error updating attribute definition:", updateError)
    return { success: false, error: updateError.message }
  }

  // 2. Limpiar opciones anteriores
  const { error: deleteOptionsError } = await supabase
    .from("attribute_options")
    .delete()
    .eq("attribute_definition_id", id)

  if (deleteOptionsError) {
    console.error("Error deleting old options:", deleteOptionsError)
    return { success: false, error: `Fallo al limpiar opciones anteriores: ${deleteOptionsError.message}` }
  }

  // 3. Registrar las nuevas opciones (si es select)
  if (input.data_type === "select" && options && options.length > 0) {
    const optionsPayload = options
      .map((val) => val.trim())
      .filter(Boolean)
      .map((val, idx) => ({
        attribute_definition_id: id,
        value: val,
        sort_order: idx,
        active: true
      }))

    if (optionsPayload.length > 0) {
      const { error: optionsError } = await supabase
        .from("attribute_options")
        .insert(optionsPayload)

      if (optionsError) {
        console.error("Error saving new options:", optionsError)
        return { success: false, error: `Error al guardar las nuevas opciones: ${optionsError.message}` }
      }
    }
  }

  revalidatePath("/attributes")
  revalidatePath("/categories")
  return { success: true }
}

// Activar o desactivar un atributo (Soft delete)
export async function toggleAttributeDefinitionStatus(
  id: string,
  currentStatus: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from("attribute_definitions")
    .update({ active: !currentStatus })
    .eq("id", id)

  if (error) {
    console.error("Error toggling attribute status:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/attributes")
  revalidatePath("/categories")
  return { success: true }
}
