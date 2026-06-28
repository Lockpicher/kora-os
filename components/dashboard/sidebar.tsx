"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { navigationGroups } from "./navigation"
import { cn } from "@/lib/utils"
import { Plus, CheckSquare, Folder, BriefcaseBusiness, Package, Zap, FileText, Bot } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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

      {/* Action Button: Nuevo */}
      <div className="px-4 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" className="w-full justify-start gap-2 h-9 shadow-xs hover:shadow-md transition-shadow">
              <Plus className="h-4 w-4" />
              <span className="font-medium">Nuevo</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[224px]">
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              <span>Nueva tarea</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Bot className="h-4 w-4 text-violet-500" />
              <span>Nueva tarea IA</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
              <span>Nuevo proyecto</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span>Nueva carpeta</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>Nuevo producto</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span>Nueva automatización</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Documento</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-6">
        <nav className="space-y-6">
          {navigationGroups.map((group) => (
            <div key={group.label}>
              <h3 className="px-3 text-xs font-semibold text-muted-foreground/70 tracking-wider mb-2">
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

      {/* User profile footer */}
      <div className="p-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
            JK
          </div>
          <div className="text-sm overflow-hidden">
            <p className="font-medium text-foreground truncate">Johnatan K.</p>
            <p className="text-xs text-muted-foreground truncate">Administrador</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
