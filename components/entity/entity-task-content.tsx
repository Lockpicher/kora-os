"use client"

import * as React from "react"

export function EntityTaskContent({ taskId }: { taskId: string }) {
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold tracking-tight text-foreground">Pulsera Jade 8 mm <span className="text-sm font-normal text-muted-foreground ml-2">#{taskId.substring(0,6)}</span></h2>
      
      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Proyecto</span>
          <p className="font-medium text-foreground">Catálogo 2026</p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Responsable</span>
          <p className="font-medium text-foreground">Johnatan K.</p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Prioridad</span>
          <p className="font-medium text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-md inline-block">Alta</p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Estado</span>
          <p className="font-medium text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md inline-block">En proceso</p>
        </div>
      </div>

      {/* Description (TipTap placeholder) */}
      <div className="pt-6 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Descripción</h3>
          {/* AutoSave Indicator Placeholder */}
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 bg-muted px-2 py-1 rounded-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Guardado
          </span>
        </div>
        <div className="min-h-[250px] p-4 rounded-lg border border-border bg-card text-sm text-muted-foreground shadow-xs">
          Editor TipTap en construcción... (Autoguardado por queue de la Fase 0)
        </div>
      </div>
    </div>
  )
}
