import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { KanbanColumnData } from '@/components/kanban/kanban-board'

export function useKanbanData(orgId: string, initialColumns?: KanbanColumnData[]) {
  return useQuery({
    queryKey: ['kanban', orgId],
    queryFn: async () => {
      const supabase = createClient()
      
      const { data: columns } = await supabase.from("workflow_columns").select("*").order("position")
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', orgId)
        .is('deleted_at', null)

      const boardColumns: KanbanColumnData[] = (columns || []).map(col => {
        const colTasks = (tasks || []).filter((t: Record<string, unknown>) => t.workflow_column_id === col.id)
        return {
          id: col.id,
          title: col.name,
          items: colTasks.map((t: Record<string, unknown>) => ({
            id: t.id as string,
            title: t.title as string,
            subtitle: (t.description as string) || undefined,
            priority: "Media",
          }))
        }
      })

      return boardColumns
    },
    initialData: initialColumns,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
