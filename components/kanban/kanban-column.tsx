"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { KanbanCard, type KanbanItem } from "./kanban-card"

interface KanbanColumnProps {
  id: string
  title: string
  items: KanbanItem[]
  selectedIds: Set<string>
  onSelect: (id: string, multi: boolean, range: boolean) => void
}

export function KanbanColumn({ id, title, items, selectedIds, onSelect }: KanbanColumnProps) {
  const { setNodeRef } = useSortable({
    id: id,
    data: {
      type: "Column",
    },
  })

  return (
    <div className="flex flex-col w-80 shrink-0 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{title}</h3>
          <span className="flex items-center justify-center bg-muted text-muted-foreground text-xs font-medium w-5 h-5 rounded-full">
            {items.length}
          </span>
        </div>
      </div>
      
      <div
        ref={setNodeRef}
        className="flex flex-col gap-3 flex-1 overflow-y-auto overflow-x-hidden p-1 min-h-[150px] bg-muted/10 rounded-xl"
      >
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <KanbanCard 
              key={item.id} 
              item={item} 
              isSelected={selectedIds.has(item.id)}
              onSelect={onSelect}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
