"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import { Search, BriefcaseBusiness, Package, Bot, CheckSquare, Target, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "@/components/ui/button"

type AICommandResponse = {
  intent: "create_task" | "create_project" | "unknown"
  confidence: number
  project?: string
  workflow?: string
  entity?: {
    type: string
    id: string
    name: string
  }
  title: string
  priority?: "baja" | "media" | "alta" | "urgente"
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [aiResult, setAiResult] = React.useState<AICommandResponse | null>(null)
  
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Reset state when closed
  React.useEffect(() => {
    if (!open) {
      setSearch("")
      setAiResult(null)
      setLoading(false)
    }
  }, [open])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  const handleQuickCapture = async (prompt: string) => {
    setLoading(true)
    try {
      const res = await fetch("/api/ai/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      })
      if (!res.ok) throw new Error("API Error")
      const data: AICommandResponse = await res.json()
      
      if (data.confidence > 0.95) {
        // Auto-execute (mocked for now)
        console.log("AUTO EXECUTING (Confidence > 0.95):", data)
        setOpen(false)
      } else {
        setAiResult(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmAi = () => {
    console.log("CONFIRMED AI EXECUTION:", aiResult)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden shadow-2xl bg-card border-border sm:max-w-[600px] rounded-xl">
        <VisuallyHidden>
          <DialogTitle>Búsqueda Global</DialogTitle>
          <DialogDescription>Buscador de comandos globales de KORA OS</DialogDescription>
        </VisuallyHidden>
        
        {aiResult ? (
          <div className="p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Bot className="h-5 w-5 text-violet-500" />
              <h3 className="font-semibold text-lg">Confirmar Acción</h3>
              <span className="ml-auto text-xs font-mono bg-violet-500/10 text-violet-500 px-2 py-1 rounded">
                Confianza: {(aiResult.confidence * 100).toFixed(0)}%
              </span>
            </div>
            
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border text-sm">
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-muted-foreground font-medium">Intención:</span>
                <span className="font-medium text-primary">{aiResult.intent}</span>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <span className="text-muted-foreground font-medium">Título:</span>
                <span className="font-medium">{aiResult.title}</span>
              </div>
              {aiResult.project && (
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-muted-foreground font-medium">Proyecto:</span>
                  <span>{aiResult.project}</span>
                </div>
              )}
              {aiResult.entity && (
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <span className="text-muted-foreground font-medium">Entidad:</span>
                  <span className="text-emerald-500">{aiResult.entity.name} <span className="text-xs text-muted-foreground">({aiResult.entity.type})</span></span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setAiResult(null)}>Cancelar</Button>
              <Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={handleConfirmAi}>
                Confirmar y Crear
              </Button>
            </div>
          </div>
        ) : (
          <Command
            shouldFilter={false} // Deshabilitamos filtro para controlar Quick Capture manually si quisieramos
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4 w-full"
          >
            <div className="flex items-center border-b border-border px-3" cmdk-input-wrapper="">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Command.Input 
                value={search}
                onValueChange={setSearch}
                placeholder="Escribe un comando o crea tareas con IA..." 
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No se encontraron comandos exactos. Presiona Enter para usar Quick Capture.
              </Command.Empty>

              {search.length > 2 && (
                <Command.Group heading="Quick Capture (KORA AI)">
                  <Command.Item 
                    onSelect={() => handleQuickCapture(search)}
                    className="flex items-center px-2 py-2 text-sm rounded-md aria-selected:bg-muted cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 text-violet-500 animate-spin" />
                    ) : (
                      <Bot className="mr-2 h-4 w-4 text-violet-500" />
                    )}
                    <span>Procesar: <span className="font-medium text-foreground ml-1">&quot;{search}&quot;</span></span>
                  </Command.Item>
                </Command.Group>
              )}

              {search.length === 0 && (
                <>
                  <Command.Group heading="Acciones Rápidas">
                    <Command.Item 
                      onSelect={() => runCommand(() => console.log("Nueva Tarea"))}
                      className="flex items-center px-2 py-2 text-sm rounded-md aria-selected:bg-muted cursor-pointer"
                    >
                      <CheckSquare className="mr-2 h-4 w-4 text-primary" />
                      <span>Crear tarea</span>
                    </Command.Item>
                    <Command.Item 
                      onSelect={() => runCommand(() => router.push("/work"))}
                      className="flex items-center px-2 py-2 text-sm rounded-md aria-selected:bg-muted cursor-pointer"
                    >
                      <BriefcaseBusiness className="mr-2 h-4 w-4 text-primary" />
                      <span>Crear proyecto</span>
                    </Command.Item>
                    <Command.Item 
                      onSelect={() => runCommand(() => router.push("/products/new"))}
                      className="flex items-center px-2 py-2 text-sm rounded-md aria-selected:bg-muted cursor-pointer"
                    >
                      <Package className="mr-2 h-4 w-4 text-primary" />
                      <span>Crear producto</span>
                    </Command.Item>
                  </Command.Group>

                  <Command.Group heading="Navegación">
                    <Command.Item 
                      onSelect={() => runCommand(() => router.push("/products"))}
                      className="flex items-center px-2 py-2 text-sm rounded-md aria-selected:bg-muted cursor-pointer"
                    >
                      <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Ir a Catálogo de Productos</span>
                    </Command.Item>
                    <Command.Item 
                      onSelect={() => runCommand(() => router.push("/work"))}
                      className="flex items-center px-2 py-2 text-sm rounded-md aria-selected:bg-muted cursor-pointer"
                    >
                      <Target className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Ir a Work Management</span>
                    </Command.Item>
                  </Command.Group>
                </>
              )}
            </Command.List>
          </Command>
        )}
      </DialogContent>
    </Dialog>
  )
}
