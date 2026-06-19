import Sidebar from "@/components/dashboard/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content wrapper */}
      <div className="pl-64">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-8">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold text-foreground">
              Catálogo Maestro KORA
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-medium border border-emerald-500/20">
              Fase 1A - Local Dev
            </span>
          </div>
        </header>

        {/* Content area */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
