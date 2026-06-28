"use client"

import * as React from "react"
import { useDrawerStore } from "@/store/drawer-store"
import { X, LayoutPanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { EntityTaskContent } from "./entity-task-content"
import { EntityTaskForm } from "./entity-task-form"
import { ActivityTimeline } from "./activity-timeline"

const entityTabs: Record<string, string[]> = {
  task: ["Detalles", "Checklist", "Comentarios", "Archivos", "Actividad", "IA"],
  project: ["Detalles", "Tareas", "Miembros", "Actividad"],
  product: ["Detalles", "Variantes", "Imágenes", "Inventario", "Ventas", "Actividad"],
  customer: ["Detalles", "Pedidos", "Actividad"],
}

export function EntityDrawer() {
  const { isOpen, closeDrawer, entityType, entityId, activeTab, setActiveTab, fullscreen, toggleFullscreen, mode } = useDrawerStore()

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeDrawer()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, closeDrawer])

  const tabs = React.useMemo(() => {
    return entityType ? entityTabs[entityType] || ["Detalles"] : ["Detalles"]
  }, [entityType])

  React.useEffect(() => {
    if (entityType && !tabs.includes(activeTab)) {
      setActiveTab(tabs[0])
    }
  }, [entityType, activeTab, tabs, setActiveTab])

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm xl:hidden"
          onClick={closeDrawer}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-screen border-l border-border bg-card shadow-2xl transition-all duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full",
          fullscreen ? "w-full" : "w-full max-w-md md:max-w-xl xl:max-w-[600px] 2xl:max-w-[700px]"
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-muted/30">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <LayoutPanelLeft className="h-4 w-4" />
            <span className="uppercase tracking-wider font-semibold">
              {entityType === "task" ? "Inspector de Tarea" : entityType === "project" ? "Inspector de Proyecto" : entityType === "product" ? "Producto" : "Detalles"}
            </span>
          </div>
          <div className="flex items-center space-x-2">
             <button 
                onClick={toggleFullscreen}
                className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
              >
                {fullscreen ? "Contraer" : "Expandir"}
              </button>
            <button 
              onClick={closeDrawer}
              className="p-2 -mr-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs Navigation Global */}
        <div className="flex space-x-6 border-b border-border overflow-x-auto scrollbar-hide px-6 shrink-0 bg-muted/10">
          {tabs.map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
                  isActive 
                    ? "border-primary text-foreground" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            )
          })}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col bg-background/50 p-6">
           {mode === "create" ? (
             <div className="flex flex-col h-full">
               <h2 className="text-xl font-semibold mb-6">Nuevo {entityType === "project" ? "Proyecto" : entityType === "task" ? "Tarea" : "Elemento"}</h2>
               {entityType === "task" ? (
                 <EntityTaskForm />
               ) : (
                 <div className="flex-1 border border-dashed border-border rounded-lg bg-muted/10 flex items-center justify-center text-sm text-muted-foreground">
                   Formulario de Creación de {entityType} en construcción...
                 </div>
               )}
             </div>
           ) : activeTab === "Actividad" ? (
              <ActivityTimeline />
           ) : (
             <>
                {entityType === "task" && entityId && activeTab === "Detalles" && (
                   <EntityTaskContent taskId={entityId} />
                )}
                {entityType === "task" && entityId && activeTab !== "Detalles" && (
                  <div className="flex h-40 items-center justify-center text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg bg-muted/10">
                    Contenido de {activeTab} en construcción.
                  </div>
                )}

                {entityType === "project" && entityId && activeTab === "Detalles" && (
                  <div className="text-sm text-muted-foreground">Project Details en construcción... (ID: {entityId})</div>
                )}
                
                {!entityType && (
                  <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                    No hay entidad seleccionada.
                  </div>
                )}
             </>
           )}
        </div>
      </aside>
    </>
  )
}
