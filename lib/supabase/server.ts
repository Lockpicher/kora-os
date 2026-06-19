import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const createClient = async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createSupabaseClient(supabaseUrl, supabaseKey)
}
