process.env.NEXT_PUBLIC_SUPABASE_URL = "https://xbfllqskejmqbmasxcqy.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiZmxscXNrZWptcWJtYXN4Y3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MzA0NjgsImV4cCI6MjA5NzQwNjQ2OH0.4cu1jBsNihuyPtH_Nxu5xAXFsGxgF1K8PU7fZIGlEqk"

import { createClient } from './lib/supabase/client'

async function run() {
  const supabase = createClient()
  const { data: tasks, error } = await supabase.from('tasks').select('*')
  if (error) console.error("ERROR FETCHING TASKS:", error)
  console.log("TASKS IN DB:", tasks)
}

run().catch(console.error)
