process.env.NEXT_PUBLIC_SUPABASE_URL = "https://xbfllqskejmqbmasxcqy.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiZmxscXNrZWptcWJtYXN4Y3F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MzA0NjgsImV4cCI6MjA5NzQwNjQ2OH0.4cu1jBsNihuyPtH_Nxu5xAXFsGxgF1K8PU7fZIGlEqk"

import { createTaskAction } from './app/actions/work.actions'

async function run() {
  const cmd = {
    title: "Test Task",
    description: "Testing from script",
    workflow_column_id: "55555555-5555-5555-5555-555555555551" // The seeded 'Todo' column
  }
  console.log("Running createTaskAction...")
  const result = await createTaskAction(cmd)
  console.log("RESULT:", result)
}

run().catch(console.error)
