"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface Supplier {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  notes: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface SupplierInput {
  name: string
  contact_name?: string
  phone?: string
  email?: string
  notes?: string
}

export async function getSuppliers(activeOnly = false): Promise<{ success: boolean; suppliers?: Supplier[]; error?: string }> {
  const supabase = await createClient()
  let query = supabase.from("suppliers").select("*").order("name", { ascending: true })
  
  if (activeOnly) {
    query = query.eq("active", true)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching suppliers:", error)
    return { success: false, error: error.message }
  }

  return { success: true, suppliers: data || [] }
}

export async function createSupplier(data: SupplierInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase.from("suppliers").insert([
    {
      name: data.name.trim(),
      contact_name: data.contact_name?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      notes: data.notes?.trim() || null,
      active: true
    }
  ])

  if (error) {
    console.error("Error creating supplier:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/suppliers")
  revalidatePath("/purchase-orders/new")
  return { success: true }
}

export async function updateSupplier(id: string, data: SupplierInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("suppliers")
    .update({
      name: data.name.trim(),
      contact_name: data.contact_name?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)

  if (error) {
    console.error("Error updating supplier:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/suppliers")
  revalidatePath("/purchase-orders/new")
  return { success: true }
}

export async function toggleSupplierStatus(id: string, currentStatus: boolean): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("suppliers")
    .update({ 
      active: !currentStatus,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)

  if (error) {
    console.error("Error toggling supplier status:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/suppliers")
  revalidatePath("/purchase-orders/new")
  return { success: true }
}
