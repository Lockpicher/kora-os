import Sidebar from "@/components/dashboard/sidebar"
import Topbar from "@/components/dashboard/topbar"
import { CommandPalette } from "@/components/dashboard/command-palette"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <CommandPalette />
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
        
        {/* Placeholder for future Task Drawer */}
        <div id="drawer-root" className="absolute top-0 right-0 h-full pointer-events-none" />
      </div>
    </div>
  )
}
