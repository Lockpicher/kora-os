"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Inbox, Kanban, ListTodo, Calendar, BarChartHorizontal, FolderTree } from "lucide-react"

const tabs = [
  { name: "Dashboard", href: "/work", icon: LayoutDashboard },
  { name: "Inbox", href: "/work/inbox", icon: Inbox },
  { name: "Kanban", href: "/work/kanban", icon: Kanban },
  { name: "Lista", href: "/work/list", icon: ListTodo },
  { name: "Calendario", href: "/work/calendar", icon: Calendar },
  { name: "Gantt", href: "/work/gantt", icon: BarChartHorizontal },
  { name: "Proyectos", href: "/work/projects", icon: FolderTree },
]

export function WorkTabs() {
  const pathname = usePathname()

  return (
    <div className="flex space-x-1 overflow-x-auto pb-1 scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        const Icon = tab.icon
        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap",
              isActive
                ? "bg-background shadow-xs border border-border text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
            {tab.name}
          </Link>
        )
      })}
    </div>
  )
}
