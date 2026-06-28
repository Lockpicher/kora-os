import { createClient } from '@/lib/supabase/server'

export async function getKanban(organizationId: string, projectId?: string) {
  const supabase = await createClient()
  
  let query = supabase.from('tasks')
    .select(`
      *,
      workflow_column:workflow_columns(id, name, color, position)
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    
  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}
