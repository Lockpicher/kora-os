import { createClient } from '@/lib/supabase/server'

export async function searchTasks(organizationId: string, searchTerm: string) {
  const supabase = await createClient()
  
  // Uses tsvector search
  const { data, error } = await supabase.from('tasks')
    .select('id, readable_id, title')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .textSearch('search_vector', searchTerm)
    .limit(10)

  if (error) throw new Error(error.message)
  return data
}
