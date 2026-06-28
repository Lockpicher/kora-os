"use client"

import * as React from "react"
import { KanbanBoard, type KanbanColumnData } from "@/components/kanban/kanban-board"
import { moveTaskAction } from "@/app/actions/work.actions"
import { useKanbanData } from "@/src/modules/work/hooks/useKanbanData"
import { useMutation, useQueryClient } from "@tanstack/react-query"

export function WorkKanbanClient({ orgId, initialColumns }: { orgId: string, initialColumns: KanbanColumnData[] }) {
  const queryClient = useQueryClient()
  const { data: columns } = useKanbanData(orgId, initialColumns)

  const moveMutation = useMutation({
    mutationFn: async ({ taskId, targetColumnId }: { taskId: string, targetColumnId: string }) => {
      const result = await moveTaskAction({ task_id: taskId, target_column_id: targetColumnId })
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onMutate: async ({ taskId, targetColumnId }) => {
      await queryClient.cancelQueries({ queryKey: ['kanban', orgId] })
      const previousData = queryClient.getQueryData(['kanban', orgId])
      
      // Optimistic update
      queryClient.setQueryData(['kanban', orgId], (old: KanbanColumnData[] | undefined) => {
        if (!old) return old
        const newCols = structuredClone(old)
        let movedTask: KanbanColumnData['items'][0] | null = null
        
        // Remove task
        for (const col of newCols) {
          const idx = col.items.findIndex(i => i.id === taskId)
          if (idx !== -1) {
            movedTask = col.items.splice(idx, 1)[0]
            break
          }
        }
        
        // Add task
        if (movedTask) {
          const targetCol = newCols.find(c => c.id === targetColumnId)
          if (targetCol) {
            targetCol.items.push(movedTask)
          }
        }
        
        return newCols
      })

      return { previousData }
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['kanban', orgId], context?.previousData)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban', orgId] })
    },
  })

  const handleDragEnd = async (taskId: string, targetColumnId: string) => {
    moveMutation.mutate({ taskId, targetColumnId })
  }

  if (!columns) return null

  return (
    <div className="h-[calc(100vh-200px)] w-full">
      <KanbanBoard columns={columns} onDragEnd={handleDragEnd} />
    </div>
  )
}
