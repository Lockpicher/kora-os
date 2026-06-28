"use client"

import React from "react"
import { Plus, Clock, LayoutGrid, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function WorkCommandCenterPage() {
  return (
    <div className="space-y-8">
      {/* Header & Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Work Management</h2>
          <p className="text-muted-foreground mt-1">
            Centro de Operaciones KORA OS
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => {
            // Trigger global search cmdk
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
          }}>
            <Search className="h-4 w-4" /> Buscar (Ctrl+K)
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Nueva Tarea
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hoy</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7 Tareas</div>
            <p className="text-xs text-muted-foreground">2 vencidas hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bloqueadas</CardTitle>
            <LayoutGrid className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">3</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>
        {/* Agrega más cards según diseño Linear */}
      </div>

      {/* Main Content Split */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Mis Proyectos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Cargando proyectos...</div>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">No hay actividad reciente.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
