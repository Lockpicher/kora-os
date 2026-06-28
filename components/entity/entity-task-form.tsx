"use client"

import * as React from "react"
import { useDrawerStore } from "@/store/drawer-store"
import { createTaskAction } from "@/app/actions/work.actions"
import { EntityForm, EntityFormField } from "@/components/forms/entity-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useQuery, useQueryClient } from "@tanstack/react-query"

export function EntityTaskForm() {
  const { closeDrawer } = useDrawerStore()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loading, setLoading] = React.useState(false)
  const supabase = createClient()

  // Fetch options (Projects, Workflows, Priorities)
  const { data: options, isLoading: isLoadingOptions } = useQuery({
    queryKey: ['task-form-options'],
    queryFn: async () => {
      const [projectsRes, workflowsRes, prioritiesRes] = await Promise.all([
        supabase.from("projects").select("id, name").order("name"),
        supabase.from("workflow_columns").select("id, name").order("position"),
        supabase.from("priorities").select("id, name").order("position")
      ])
      return {
        projects: projectsRes.data || [],
        workflows: workflowsRes.data || [],
        priorities: prioritiesRes.data || []
      }
    }
  })

  const [projectId, setProjectId] = React.useState<string>("")
  const [workflowColumnId, setWorkflowColumnId] = React.useState<string>("")
  const [priorityId, setPriorityId] = React.useState<string>("")

  // Set default workflow column when options load
  React.useEffect(() => {
    if (options?.workflows && options.workflows.length > 0 && !workflowColumnId) {
      setWorkflowColumnId(options.workflows[0].id)
    }
  }, [options, workflowColumnId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const cmd = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      project_id: projectId || undefined,
      workflow_column_id: workflowColumnId,
      priority_id: priorityId || undefined
    }

    if (!cmd.workflow_column_id) {
      alert("Por favor selecciona un flujo de trabajo")
      setLoading(false)
      return
    }

    const res = await createTaskAction(cmd as Record<string, unknown>)
    setLoading(false)
    
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      closeDrawer()
      alert("Tarea creada con éxito") // Reemplazar con toast real si existe
      router.push("/work/kanban")
      router.refresh()
    } else {
      alert(`Error al crear la tarea: ${res.error}`)
    }
  }

  if (isLoadingOptions) {
    return <div className="p-6 text-center text-muted-foreground animate-pulse">Cargando opciones...</div>
  }

  return (
    <EntityForm onSubmit={handleSubmit} className="h-full flex flex-col">
      <div className="flex-1 space-y-6">
        <EntityFormField label="Título" required>
          <Input name="title" placeholder="Ej. Rediseñar página de inicio" required className="text-sm font-medium" />
        </EntityFormField>
        
        <EntityFormField label="Proyecto">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar proyecto..." />
            </SelectTrigger>
            <SelectContent>
              {options?.projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EntityFormField>

        <EntityFormField label="Flujo de Trabajo (Columna)" required>
          <Select value={workflowColumnId} onValueChange={setWorkflowColumnId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar estado..." />
            </SelectTrigger>
            <SelectContent>
              {options?.workflows.map(w => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EntityFormField>

        <EntityFormField label="Prioridad">
          <Select value={priorityId} onValueChange={setPriorityId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar prioridad..." />
            </SelectTrigger>
            <SelectContent>
              {options?.priorities.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EntityFormField>

        <EntityFormField label="Descripción">
          <textarea 
            name="description" 
            placeholder="Añade detalles adicionales..." 
            className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
          />
        </EntityFormField>
      </div>

      <div className="pt-6 border-t border-border mt-auto flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={closeDrawer}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? "Creando..." : "Crear Tarea"}</Button>
      </div>
    </EntityForm>
  )
}
