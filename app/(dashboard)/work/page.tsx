"use client"

import * as React from "react"
import { Calendar, CheckSquare, Clock, AlertTriangle, UserMinus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const tabs = ["Dashboard", "Inbox", "Kanban", "Lista", "Calendario", "Gantt", "Proyectos"]

export default function WorkCommandCenterPage() {
  const [activeTab, setActiveTab] = React.useState("Dashboard")

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto h-full flex flex-col">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 border-b border-border pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Work Management</h2>
        </div>
        <div className="flex space-x-1 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                activeTab === tab
                  ? "bg-background shadow-xs border border-border text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-8">
        {activeTab === "Dashboard" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Row 1: KPIs Urgentes */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">KPIs Urgentes</h3>
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="shadow-xs border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Hoy</CardTitle>
                    <Calendar className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">12</div>
                  </CardContent>
                </Card>
                <Card className="shadow-xs border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Vencidas</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">4</div>
                  </CardContent>
                </Card>
                <Card className="shadow-xs border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">En Progreso</CardTitle>
                    <Clock className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">8</div>
                  </CardContent>
                </Card>
                <Card className="shadow-xs border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Completadas</CardTitle>
                    <CheckSquare className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">34</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Row 2: Estado de mis tareas */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Estado de Mis Tareas</h3>
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="shadow-xs border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Mis Tareas</CardTitle>
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">19</div>
                  </CardContent>
                </Card>
                <Card className="shadow-xs border-border/50 bg-orange-500/5">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-orange-600">Bloqueadas</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-500">2</div>
                  </CardContent>
                </Card>
                <Card className="shadow-xs border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Sin Asignar</CardTitle>
                    <UserMinus className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">5</div>
                  </CardContent>
                </Card>
                <Card className="shadow-xs border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Vencen Hoy</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">3</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Row 3: Vistas generales */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Paneles</h3>
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="col-span-1 shadow-xs border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Actividad Reciente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">No hay actividad reciente.</div>
                  </CardContent>
                </Card>
                <Card className="col-span-1 shadow-xs border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Calendario</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">Vista de mes en construcción.</div>
                  </CardContent>
                </Card>
                <Card className="col-span-1 shadow-xs border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Últimos Proyectos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">KORA OS - Activo</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab !== "Dashboard" && (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border mt-8">
            <p className="text-muted-foreground">Vista de <span className="font-semibold text-foreground">{activeTab}</span> en construcción.</p>
          </div>
        )}
      </div>
    </div>
  )
}
