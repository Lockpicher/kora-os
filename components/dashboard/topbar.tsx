"use client"

import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { navigationGroups } from "./navigation"

export default function Topbar() {
  const pathname = usePathname()

  let activeItemName = "Dashboard"
  let activeGroupName = "GENERAL"

  navigationGroups.forEach((group) => {
    group.items.forEach((item) => {
      if (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))) {
        activeItemName = item.name
        activeGroupName = group.label
      }
    })
  })

  const organizationName = "Grupo Kubbonet"

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-8">
      <div className="flex items-center text-sm font-medium text-muted-foreground">
        <span>{organizationName}</span>
        <ChevronRight className="mx-2 h-4 w-4" />
        {activeGroupName !== "GENERAL" && (
          <>
            <span className="capitalize">{activeGroupName.toLowerCase()}</span>
            <ChevronRight className="mx-2 h-4 w-4" />
          </>
        )}
        <span className="text-foreground">{activeItemName}</span>
      </div>
      
      <div className="flex items-center space-x-4">
        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-medium border border-emerald-500/20">
          Fase 1A - Local Dev
        </span>
      </div>
    </header>
  )
}
