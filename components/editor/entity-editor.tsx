"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useDrawerStore } from "@/store/drawer-store"
import { AutoSaveQueueManager } from "@/components/entity/autosave-queue"

interface EntityEditorProps {
  initialContent: string
  entityId: string
  entityType: string
  field: string
  className?: string
}

const queue = new AutoSaveQueueManager()

export function EntityEditor({ initialContent, entityId, entityType, field, className }: EntityEditorProps) {
  const [content, setContent] = React.useState(initialContent)
  const { setSaving } = useDrawerStore()

  // Simulate AutoSave Debounce
  React.useEffect(() => {
    if (content === initialContent) return

    const timer = setTimeout(() => {
      setSaving(true)
      queue.add({
        id: crypto.randomUUID(),
        entityId,
        entityType,
        payload: { [field]: content }
      })
      // Simular evento para apagar el saving state en la UI
      setTimeout(() => setSaving(false), 800)
    }, 1000)

    return () => clearTimeout(timer)
  }, [content, initialContent, entityId, entityType, field, setSaving])

  return (
    <div className={cn("border border-border rounded-lg bg-card overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all", className)}>
      <div className="flex items-center gap-1 p-1 border-b border-border bg-muted/30">
        <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground text-xs font-bold">B</button>
        <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground text-xs italic">I</button>
        <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground text-xs underline">U</button>
        <div className="w-px h-4 bg-border mx-1" />
        <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground text-xs">h1</button>
        <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground text-xs">h2</button>
      </div>
      <textarea 
        className="w-full min-h-[200px] p-4 bg-transparent resize-y outline-none text-sm"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escribe algo aquí..."
      />
    </div>
  )
}
