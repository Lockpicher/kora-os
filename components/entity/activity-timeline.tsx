"use client"

import * as React from "react"

export function ActivityTimeline() {
  const events = [
    { time: "Hace 2 minutos", description: "Prioridad cambiada a Alta", actor: "Johnatan K." },
    { time: "Hace 5 minutos", description: "Movida a Review", actor: "Carlos G." },
    { time: "Hace 10 minutos", description: "Descripción editada", actor: "Johnatan K." },
  ]

  return (
    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
      {events.map((event, index) => (
        <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          <div className="flex items-center justify-center w-5 h-5 rounded-full border border-border bg-card shrink-0 text-muted-foreground z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          </div>
          <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] p-4 rounded border border-border bg-card shadow-xs">
            <div className="flex items-center justify-between space-x-2 mb-1">
              <div className="font-semibold text-sm text-foreground">{event.actor}</div>
              <time className="text-xs font-medium text-muted-foreground">{event.time}</time>
            </div>
            <div className="text-sm text-muted-foreground">{event.description}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
