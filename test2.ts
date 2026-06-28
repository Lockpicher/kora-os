process.env.NEXT_PUBLIC_SUPABASE_URL = "https://xbfllqskejmqbmasxcqy.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiZmxscXNrZWptcWJtYXN4Y3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MzA0NjgsImV4cCI6MjA5NzQwNjQ2OH0.4cu1jBsNihuyPtH_Nxu5xAXFsGxgF1K8PU7fZIGlEqk"

import { createClient } from './lib/supabase/client'

async function run() {
  const supabase = createClient()
  const [projectsRes, workflowsRes, prioritiesRes] = await Promise.all([
    supabase.from("projects").select("id, name").order("name"),
    supabase.from("workflow_columns").select("id, name").order("position"),
    supabase.from("priorities").select("id, name").order("position")
  ])
  console.log("PROJECTS:", projectsRes.data)
  console.log("WORKFLOWS:", workflowsRes.data)
  console.log("PRIORITIES:", prioritiesRes.data)
}

run().catch(console.error)
