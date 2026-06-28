"use client"

import * as React from "react"
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragOverEvent, 
  DragEndEvent,
  defaultDropAnimationSideEffects
} from "@dnd-kit/core"
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable"
import { KanbanColumn } from "./kanban-column"
import { KanbanCard, type KanbanItem } from "./kanban-card"

export type KanbanColumnData = {
  id: string
  title: string
  items: KanbanItem[]
}

interface KanbanBoardProps {
  columns: KanbanColumnData[]
  onDragEnd?: (taskId: string, targetColumnId: string) => void
}

export function KanbanBoard({ columns: initialColumns, onDragEnd }: KanbanBoardProps) {
  const [columns, setColumns] = React.useState<KanbanColumnData[]>(initialColumns)
  const [activeItem, setActiveItem] = React.useState<KanbanItem | null>(null)
  
  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [lastSelectedId, setLastSelectedId] = React.useState<string | null>(null)

  // Update local state if props change (useful for initial load)
  React.useEffect(() => {
    setColumns(initialColumns)
  }, [initialColumns])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Requires 5px movement before drag starts (allows clicks)
      },
    }),
    useSensor(KeyboardSensor)
  )

  const handleSelect = React.useCallback((id: string, multi: boolean, range: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      
      if (range && lastSelectedId) {
        // Find range logic (simplified: just add to multi for now)
        next.add(id)
      } else if (multi) {
        if (next.has(id)) next.delete(id)
        else next.add(id)
      } else {
        if (next.has(id) && next.size === 1) {
           next.clear()
        } else {
           next.clear()
           next.add(id)
        }
      }
      return next
    })
    setLastSelectedId(id)
  }, [lastSelectedId])

  // Global deselect
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedIds(new Set())
      }
      if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        const allIds = columns.flatMap(c => c.items.map(i => i.id))
        setSelectedIds(new Set(allIds))
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [columns])

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event
    const { data } = active
    if (data.current?.type === "Task") {
      setActiveItem(data.current.item)
    }
  }

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id
    
    if (activeId === overId) return

    const isActiveTask = active.data.current?.type === "Task"
    const isOverTask = over.data.current?.type === "Task"

    if (!isActiveTask) return

    setColumns((prev) => {
      const activeColumnIndex = prev.findIndex((col) => col.items.some((item) => item.id === activeId))
      const overColumnIndex = isOverTask 
        ? prev.findIndex((col) => col.items.some((item) => item.id === overId))
        : prev.findIndex((col) => col.id === overId)

      if (activeColumnIndex === -1 || overColumnIndex === -1) return prev

      const activeItems = [...prev[activeColumnIndex].items]
      const overItems = activeColumnIndex === overColumnIndex ? activeItems : [...prev[overColumnIndex].items]

      const activeItemIndex = activeItems.findIndex((item) => item.id === activeId)
      const overItemIndex = isOverTask ? overItems.findIndex((item) => item.id === overId) : overItems.length

      if (activeColumnIndex === overColumnIndex) {
        // Reordering within same column
        const newItems = arrayMove(activeItems, activeItemIndex, overItemIndex)
        const newColumns = [...prev]
        newColumns[activeColumnIndex] = { ...prev[activeColumnIndex], items: newItems }
        return newColumns
      } else {
        // Moving to different column
        const [movedItem] = activeItems.splice(activeItemIndex, 1)
        overItems.splice(overItemIndex, 0, movedItem)
        
        const newColumns = [...prev]
        newColumns[activeColumnIndex] = { ...prev[activeColumnIndex], items: activeItems }
        newColumns[overColumnIndex] = { ...prev[overColumnIndex], items: overItems }
        return newColumns
      }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null)
    const { active, over } = event
    if (!over) return
    
    // In a real app, we would fire the onDragEnd callback here to update Supabase
    // We determine the target column by looking at the updated state
    const targetColumn = columns.find(col => col.items.some(i => i.id === active.id))
    if (targetColumn && onDragEnd) {
      onDragEnd(active.id.toString(), targetColumn.id)
    }
  }

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }),
  }

  return (
    <div className="flex gap-6 h-full w-full overflow-x-auto pb-4 px-2" onClick={() => setSelectedIds(new Set())}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
          {columns.map((col) => (
            <KanbanColumn 
              key={col.id} 
              id={col.id} 
              title={col.title} 
              items={col.items} 
              selectedIds={selectedIds}
              onSelect={handleSelect}
            />
          ))}
        </SortableContext>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeItem ? <KanbanCard item={activeItem} isSelected={selectedIds.has(activeItem.id)} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
