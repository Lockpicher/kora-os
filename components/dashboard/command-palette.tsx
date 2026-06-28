"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import { Search, BriefcaseBusiness, Package, Bot, CheckSquare, Zap, Target } from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
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

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden shadow-2xl bg-card border-border sm:max-w-[600px] rounded-xl">
        <VisuallyHidden>
          <DialogTitle>Búsqueda Global</DialogTitle>
          <DialogDescription>
            Buscador de comandos globales de KORA OS
          </DialogDescription>
        </VisuallyHidden>
        <Command
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4 w-full"
        >
          <div className="flex items-center border-b border-border px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input 
              placeholder="Escribe un comando o busca algo..." 
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No se encontraron resultados.
            </Command.Empty>

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

            <Command.Group heading="KORA AI">
              <Command.Item 
                onSelect={() => runCommand(() => console.log("KORA AI"))}
                className="flex items-center px-2 py-2 text-sm rounded-md aria-selected:bg-muted cursor-pointer"
              >
                <Bot className="mr-2 h-4 w-4 text-violet-500" />
                <span>Preguntar a KORA...</span>
              </Command.Item>
              <Command.Item 
                onSelect={() => runCommand(() => console.log("Ejecutar Sincronización ML"))}
                className="flex items-center px-2 py-2 text-sm rounded-md aria-selected:bg-muted cursor-pointer"
              >
                <Zap className="mr-2 h-4 w-4 text-violet-500" />
                <span>Ejecutar Sincronización MercadoLibre</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
