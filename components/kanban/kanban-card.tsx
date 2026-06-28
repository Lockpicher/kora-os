"use client"

import * as React from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { EntityCard, type EntityItem } from "@/components/entity/entity-card"

export type KanbanItem = EntityItem & {
  priority?: "Baja" | "Media" | "Alta" | "Urgente" | string
  assignee?: string
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
    if (onSelect) {
      e.stopPropagation()
      onSelect(item.id, e.ctrlKey || e.metaKey, e.shiftKey)
    }
  }

  // Convert priority to generic badges for EntityCard
  const badges = []
  if (item.priority) {
    badges.push({
      label: item.priority,
      colorClass: 
        item.priority === "Alta" ? "bg-orange-500/10 text-orange-500" :
        item.priority === "Urgente" ? "bg-destructive/10 text-destructive" :
        "bg-muted text-muted-foreground"
    })
  }

  const entityItem: EntityItem = {
    ...item,
    badges
  }

  return (
    <EntityCard
      item={entityItem}
      isSelected={isSelected}
      onClick={handleClick}
      isDragging={isDragging}
      setNodeRef={setNodeRef}
      style={style}
      dragAttributes={attributes}
      dragListeners={listeners}
    />
  )
}
