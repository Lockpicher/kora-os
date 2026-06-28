import Sidebar from "@/components/dashboard/sidebar"
import Topbar from "@/components/dashboard/topbar"
import { CommandPalette } from "@/components/dashboard/command-palette"
import { EntityDrawer } from "@/components/entity/entity-drawer"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <CommandPalette />
      <EntityDrawer />
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content wrapper */}
      <div className="pl-64 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <Topbar />

        {/* Content area */}
        <main className="flex-1 overflow-auto bg-muted/10">
          <div className="p-8 h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
