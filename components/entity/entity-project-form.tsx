"use client"

import * as React from "react"
import { useDrawerStore } from "@/store/drawer-store"
import { createProjectAction } from "@/app/actions/project.actions"
import { EntityForm, EntityFormField } from "@/components/forms/entity-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"

export function EntityProjectForm() {
  const { closeDrawer } = useDrawerStore()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const cmd = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
    }

    const res = await createProjectAction(cmd as Record<string, unknown>)
    setLoading(false)
    
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      closeDrawer()
      alert("Proyecto creado con éxito")
      router.refresh()
    } else {
      alert(`Error al crear el proyecto: ${res.error}`)
    }
  }

  return (
    <EntityForm onSubmit={handleSubmit} className="h-full flex flex-col">
      <div className="flex-1 space-y-6">
        <EntityFormField label="Nombre del Proyecto" required>
          <Input name="name" placeholder="Ej. Rediseño Web" required className="text-sm font-medium" />
        </EntityFormField>

        <EntityFormField label="Descripción">
          <textarea 
            name="description" 
            placeholder="Añade detalles del proyecto..." 
            className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
          />
        </EntityFormField>
      </div>

      <div className="pt-6 border-t border-border mt-auto flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={closeDrawer}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? "Creando..." : "Crear Proyecto"}</Button>
      </div>
    </EntityForm>
  )
}
