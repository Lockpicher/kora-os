import { createClient } from "@/lib/supabase/server"
import { KanbanColumnData } from "@/components/kanban/kanban-board"
import { getKanban } from "@/src/modules/work/queries/GetKanban"
import { WorkKanbanClient } from "./kanban-client"

export default async function WorkKanbanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // MOCK USER: Since SSR cookies aren't fully configured in lib/supabase/server.ts yet
  const activeUser = user || { id: '00000000-0000-0000-0000-000000000001' }

  const { data: orgMember } = await supabase.from("organization_members").select("organization_id").eq("user_id", activeUser.id).single()
  const orgId = orgMember?.organization_id

  if (!orgId) {
    return <div className="p-8">No hay organización asociada (Intenta crear una tarea para auto-enlazar).</div>
  }

  const { data: columns } = await supabase.from("workflow_columns").select("*").order("position")
  const tasks = await getKanban(orgId)

  const boardColumns: KanbanColumnData[] = (columns || []).map(col => {
    // getKanban devuelve arrays o any. Filtramos con fallback
    const colTasks = (tasks || []).filter((t: { workflow_column_id: string }) => t.workflow_column_id === col.id)
    return {
      id: col.id,
      title: col.name,
      items: colTasks.map((t: { id: string; title: string; description?: string }) => ({
        id: t.id,
        title: t.title,
        subtitle: t.description || undefined,
        priority: "Media", // TODO: Map priority
      }))
    }
  })

  if (boardColumns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed border-border rounded-xl mt-8 space-y-4">
        <p className="text-muted-foreground">No hay flujos de trabajo configurados.</p>
      </div>
    )
  }

  return <WorkKanbanClient orgId={orgId} initialColumns={boardColumns} />
}
