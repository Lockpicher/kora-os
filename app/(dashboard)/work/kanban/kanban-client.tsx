"use client"

import * as React from "react"
import { KanbanBoard, type KanbanColumnData } from "@/components/kanban/kanban-board"
import { moveTaskAction } from "@/app/actions/work.actions"

export function WorkKanbanClient({ initialColumns }: { initialColumns: KanbanColumnData[] }) {
  const [columns] = React.useState(initialColumns)

  const handleDragEnd = async (taskId: string, targetColumnId: string) => {
    // KanbanBoard ya actualiza su estado local optimista, aquí solo persistimos a BD
    const result = await moveTaskAction({
      task_id: taskId,
      target_column_id: targetColumnId
    })

    if (!result.success) {
      console.error("Failed to move task", result.error)
      // En el futuro: Rollback estado + Toast de error
    }
  }

  return (
    <div className="h-[calc(100vh-200px)] w-full">
      <KanbanBoard columns={columns} onDragEnd={handleDragEnd} />
    </div>
  )
}
