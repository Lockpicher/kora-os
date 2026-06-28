"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type EntityItem = {
  id: string
  title: string
  subtitle?: string
  badges?: { label: string; colorClass?: string }[]
  tags?: string[]
}

interface EntityCardProps<TAttrs = Record<string, unknown>, TListeners = Record<string, unknown>> {
  item: EntityItem
  isSelected?: boolean
  onClick?: (e: React.MouseEvent) => void
  isDragging?: boolean
  className?: string
  dragListeners?: TListeners
  dragAttributes?: TAttrs
  setNodeRef?: (node: HTMLElement | null) => void
  style?: React.CSSProperties
}

export function EntityCard<TAttrs, TListeners>({ 
  item, 
  isSelected, 
  onClick, 
  isDragging, 
  className,
  dragListeners,
  dragAttributes,
  setNodeRef,
  style
}: EntityCardProps<TAttrs, TListeners>) {
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      {...dragAttributes}
      {...dragListeners}
      className={cn(
        "relative group flex flex-col gap-2 p-3 rounded-lg border border-border bg-card shadow-xs transition-colors",
        dragListeners ? "cursor-grab active:cursor-grabbing hover:border-primary/50" : "hover:border-border/80 cursor-pointer",
        isDragging && "opacity-50 ring-2 ring-primary ring-offset-2 ring-offset-background",
        isSelected && "ring-2 ring-primary bg-primary/5 border-primary",
        className
      )}
    >
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
      
      {(item.badges?.length || item.tags?.length) ? (
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {item.badges?.map((badge, idx) => (
            <span key={idx} className={cn(
              "text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded-sm",
              badge.colorClass || "bg-muted text-muted-foreground"
            )}>
              {badge.label}
            </span>
          ))}
          {item.tags?.map(tag => (
             <span key={tag} className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-blue-500/10 text-blue-500">
               {tag}
             </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
