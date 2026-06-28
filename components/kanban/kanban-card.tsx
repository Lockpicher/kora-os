"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"

export type KanbanItem = {
  id: string
  title: string
  subtitle?: string
  priority?: "Baja" | "Media" | "Alta" | "Urgente" | string
  assignee?: string
  tags?: string[]
}

interface KanbanCardProps {
  item: KanbanItem
  isSelected?: boolean
  onSelect?: (id: string, multi: boolean, range: boolean) => void
}

export function KanbanCard({ item, isSelected, onSelect }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: {
      type: "Task",
      item,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleClick = (e: React.MouseEvent) => {
    // Only handle selection if not dragging (dnd-kit handles dragging via listeners)
    // We stop propagation so we can click the card without dragging it
    if (onSelect) {
      e.stopPropagation()
      onSelect(item.id, e.ctrlKey || e.metaKey, e.shiftKey)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      {...attributes}
      {...listeners}
      className={cn(
        "relative group flex flex-col gap-2 p-3 rounded-lg border border-border bg-card shadow-xs cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors",
        isDragging && "opacity-50 ring-2 ring-primary ring-offset-2 ring-offset-background",
        isSelected && "ring-2 ring-primary bg-primary/5 border-primary"
      )}
    >
      {/* Checkbox for visual multi-select feedback */}
      <div 
        className={cn(
          "absolute top-3 left-3 w-4 h-4 rounded border transition-opacity",
          isSelected ? "opacity-100 bg-primary border-primary" : "opacity-0 group-hover:opacity-100 border-muted-foreground/50 bg-background"
        )}
      >
        {isSelected && (
          <svg className="w-full h-full text-primary-foreground p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      <div className={cn("text-sm font-medium text-foreground", isSelected || "group-hover:pl-6 pl-0 transition-all duration-200", isSelected && "pl-6")}>
        {item.title}
      </div>
      
      {item.subtitle && (
        <div className="text-xs text-muted-foreground line-clamp-2">
          {item.subtitle}
        </div>
      )}
      
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {item.priority && (
          <span className={cn(
            "text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded-sm",
            item.priority === "Alta" ? "bg-orange-500/10 text-orange-500" :
            item.priority === "Urgente" ? "bg-destructive/10 text-destructive" :
            "bg-muted text-muted-foreground"
          )}>
            {item.priority}
          </span>
        )}
        {item.tags?.map(tag => (
           <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-blue-500/10 text-blue-500">
             {tag}
           </span>
        ))}
      </div>
    </div>
  )
}
