import { WorkTabs } from "@/components/work/work-tabs"

export default function WorkLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="max-w-[1400px] mx-auto h-full flex flex-col relative space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 border-b border-border pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Work Management</h2>
        </div>
        <WorkTabs />
      </div>

      {/* Main Content Area & Task Drawer Placeholder */}
      <div className="flex-1 flex overflow-hidden">
        {/* Children (Active Tab Content) */}
        <div className="flex-1 overflow-y-auto pb-8">
          {children}
        </div>

        {/* Placeholder para futuro TaskDrawer a la derecha */}
        <div id="work-drawer-root" className="absolute top-0 right-0 h-full pointer-events-none" />
      </div>
    </div>
  )
}
