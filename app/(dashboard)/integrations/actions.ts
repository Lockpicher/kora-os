"use server"

import { createClient } from "@/lib/supabase/server"


export interface SalesChannel {
  id: string
  name: string
  code: string
  active: boolean
  created_at: string
}

export async function getSalesChannels(): Promise<{ success: boolean; channels?: SalesChannel[]; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("sales_channels")
    .select("*")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching sales channels:", error)
    return { success: false, error: error.message }
  }

  return { success: true, channels: data || [] }
}
