"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { navigationGroups } from "./navigation"
import { cn } from "@/lib/utils"
import { Plus, CheckSquare, Folder, BriefcaseBusiness, Package, FileText, Bot, Upload, Settings, Star, Clock, FileSpreadsheet } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-border bg-card">
      {/* Header / Logo */}
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
            KORA OS
          </span>
        </Link>
      </div>

      {/* Action Button: Nuevo Launcher */}
      <div className="px-4 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" className="w-full justify-between h-9 shadow-xs hover:shadow-md transition-shadow px-3">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="font-medium">Nuevo</span>
              </div>
              <span className="text-[10px] bg-background/20 rounded px-1.5 py-0.5 text-primary-foreground/70 font-mono tracking-widest">
                ⌘K
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[224px]">
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Crear</DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              <span>Tarea</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
              <span>Proyecto</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span>Carpeta</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>Producto</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Documento</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-violet-500 uppercase tracking-wider font-semibold">IA</DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Bot className="h-4 w-4 text-violet-500" />
              <span>Crear con IA</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Bot className="h-4 w-4 text-violet-500" />
              <span>Analizar proyecto</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Importar</DropdownMenuLabel>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span>CSV</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <span>Excel</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Package className="h-4 w-4 text-yellow-500" />
              <span>Mercado Libre</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-6">
        <nav className="space-y-6">
          {navigationGroups.map((group) => (
            <div key={group.label}>
              <h3 className="px-3 text-[11px] font-semibold text-muted-foreground/70 tracking-wider mb-2 uppercase">
                {group.label}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "mr-3 h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Footer Section */}
      <div className="p-3 border-t border-border space-y-0.5 shrink-0">
        <button className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground">
          <Star className="mr-3 h-4 w-4 text-yellow-500" />
          Favoritos
        </button>
        <button className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground mb-4">
          <Clock className="mr-3 h-4 w-4" />
          Recientes
        </button>
        
        <div className="h-px bg-border my-2 -mx-3" />
        
        <button className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground">
          <Settings className="mr-3 h-4 w-4" />
          Configuración
        </button>
        
        <div className="flex items-center space-x-3 px-3 py-2 mt-2 rounded-md hover:bg-muted transition-colors cursor-pointer">
          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
            JK
          </div>
          <div className="text-sm overflow-hidden flex-1">
            <p className="font-medium text-foreground truncate">Johnatan K.</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
