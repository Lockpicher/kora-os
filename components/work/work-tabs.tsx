"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { name: "Dashboard", href: "/work" },
  { name: "Inbox", href: "/work/inbox" },
  { name: "Kanban", href: "/work/kanban" },
  { name: "Lista", href: "/work/list" },
  { name: "Calendario", href: "/work/calendar" },
  { name: "Gantt", href: "/work/gantt" },
  { name: "Proyectos", href: "/work/projects" },
]

export function WorkTabs() {
  const pathname = usePathname()

  return (
    <div className="flex space-x-1 overflow-x-auto pb-1 scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap",
              isActive
                ? "bg-background shadow-xs border border-border text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab.name}
          </Link>
        )
      })}
    </div>
  )
}
