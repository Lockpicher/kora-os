"use client"

import * as React from "react"
import { useDrawerStore } from "@/store/drawer-store"
import { createTaskAction } from "@/app/actions/work.actions"
import { EntityForm, EntityFormField } from "@/components/forms/entity-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

export function EntityTaskForm() {
  const { closeDrawer } = useDrawerStore()
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    // Hardcoded organization_id and workflow_column_id for now 
    // In a real app this would be selected via Select components or context
    const cmd = {
      organization_id: "00000000-0000-0000-0000-000000000000", // Would be fetched from context
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      workflow_column_id: "00000000-0000-0000-0000-000000000000" // Would be selected
    }

    // Call server action
    await createTaskAction(cmd as import("@/src/modules/work/commands/CreateTaskCommand").CreateTaskCommand) // Typecast for mock UUIDs bypass
    
    setLoading(false)
    closeDrawer()
    router.refresh() // Temporary until TanStack Query is in place
  }

  return (
    <EntityForm onSubmit={handleSubmit} className="h-full flex flex-col">
      <div className="flex-1 space-y-6">
        <EntityFormField label="Título" required>
          <Input name="title" placeholder="Ej. Rediseñar página de inicio" required className="text-sm font-medium" />
        </EntityFormField>
        
        <EntityFormField label="Proyecto">
          <Input name="project" placeholder="Buscar proyecto..." disabled className="bg-muted/50" />
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
        <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Crear Tarea"}</Button>
      </div>
    </EntityForm>
  )
}
