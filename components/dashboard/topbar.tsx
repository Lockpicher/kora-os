"use client"

import { usePathname } from "next/navigation"
import { ChevronRight, Search, Bell, TerminalSquare, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Topbar() {
  const pathname = usePathname()
  const organizationName = "Grupo Kubbonet"

  // Simple breadcrumb generator based on pathname segments
  const segments = pathname.split("/").filter(Boolean)
  
  let breadcrumb = []
  if (segments.length === 0) {
    breadcrumb = ["Dashboard"]
  } else {
    // Top level module
    const topLevel = segments[0]
    breadcrumb.push(topLevel.charAt(0).toUpperCase() + topLevel.slice(1))
    
    // Sub level (e.g. kanban, projects)
    if (segments.length > 1) {
       const subLevel = segments[1]
       breadcrumb.push(subLevel.charAt(0).toUpperCase() + subLevel.slice(1))
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm font-medium text-muted-foreground">
        <span className="text-foreground font-semibold">{organizationName}</span>
        <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground/50" />
        {breadcrumb.map((segment, index) => (
          <div key={index} className="flex items-center">
            <span className={index === breadcrumb.length - 1 ? "text-foreground" : "text-muted-foreground"}>
              {segment}
            </span>
            {index < breadcrumb.length - 1 && (
              <ChevronRight className="mx-2 h-4 w-4 text-muted-foreground/50" />
            )}
          </div>
        ))}
      </div>
      
      {/* Quick Actions */}
      <div className="flex items-center space-x-1">
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground">
          <Search className="h-4 w-4" />
          <span className="sr-only">Buscar</span>
        </Button>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="sr-only">Notificaciones</span>
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-9 gap-2 px-2 text-muted-foreground"
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
          }}
        >
          <TerminalSquare className="h-4 w-4" />
          <span className="text-[10px] font-mono tracking-widest bg-muted px-1.5 py-0.5 rounded">⌘K</span>
        </Button>
        
        <div className="w-px h-5 bg-border mx-2" />
        
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground rounded-full">
          <UserCircle className="h-5 w-5" />
          <span className="sr-only">Usuario</span>
        </Button>
      </div>
    </header>
  )
}
