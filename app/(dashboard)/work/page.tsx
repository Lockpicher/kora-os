import * as React from "react"
import { Calendar, CheckSquare, Clock, AlertTriangle, ListTodo, UserCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/server"

export default async function WorkDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let kpiHoy = 0
  let kpiVencidas = 0
  let kpiProgreso = 0
  let kpiCompletadas = 0
  let kpiMisTareas = 0
  let kpiDelegadas = 0
  const recentProjects: {id: string, name: string, status: string}[] = []

  if (user) {
    const { data: orgMember } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).single()
    const orgId = orgMember?.organization_id

    if (orgId) {
      // Get all tasks for org
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, due_date, completed_at, created_by")
        .eq("organization_id", orgId)
        .is("deleted_at", null)

      if (tasks) {
        const todayStr = new Date().toISOString().split("T")[0]
        
        tasks.forEach(t => {
          const isCompleted = !!t.completed_at
          
          if (isCompleted) {
            kpiCompletadas++
          } else {
            kpiProgreso++
            
            if (t.due_date) {
              const dueStr = new Date(t.due_date).toISOString().split("T")[0]
              if (dueStr === todayStr) kpiHoy++
              if (new Date(t.due_date) < new Date(todayStr)) kpiVencidas++
            }
          }
          
          if (t.created_by === user.id) {
            kpiMisTareas++
          } else {
            kpiDelegadas++
          }
        })
      }

      // Recent projects
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, status")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(3)
        
      if (projects) {
        recentProjects.push(...projects)
      }
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="grid gap-6 md:grid-cols-4 lg:grid-cols-5">
        {/* Giant "Hoy" Card */}
        <Card className="col-span-full md:col-span-2 lg:col-span-2 shadow-sm border-border/60 bg-gradient-to-br from-card to-muted/20 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Calendar className="w-32 h-32" />
          </div>
          <CardHeader className="relative z-10 pb-0">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 pb-8 pt-4">
            <div className="text-7xl font-extrabold tracking-tighter text-foreground">{kpiHoy}</div>
            <p className="text-sm font-medium text-muted-foreground mt-2">Tareas para hoy</p>
          </CardContent>
        </Card>

        {/* Secondary KPIs */}
        <div className="col-span-full md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-xs border-border/50 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vencidas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{kpiVencidas}</div>
            </CardContent>
          </Card>
          <Card className="shadow-xs border-border/50 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">En Progreso</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{kpiProgreso}</div>
            </CardContent>
          </Card>
          <Card className="shadow-xs border-border/50 flex flex-col justify-center">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completadas</CardTitle>
              <CheckSquare className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{kpiCompletadas}</div>
            </CardContent>
          </Card>

          {/* Extra generic indicators below the main 3 */}
          <Card className="shadow-xs border-border/50 bg-muted/20 sm:col-span-3 flex items-center p-4">
             <div className="flex w-full items-center justify-around">
               <div className="flex items-center gap-3">
                 <ListTodo className="h-5 w-5 text-muted-foreground" />
                 <div>
                   <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Mis Tareas</p>
                   <p className="text-xl font-bold">{kpiMisTareas}</p>
                 </div>
               </div>
               <div className="w-px h-8 bg-border" />
               <div className="flex items-center gap-3">
                 <UserCircle className="h-5 w-5 text-muted-foreground" />
                 <div>
                   <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Delegadas</p>
                   <p className="text-xl font-bold">{kpiDelegadas}</p>
                 </div>
               </div>
             </div>
          </Card>
        </div>
      </div>

      {/* Row 3: Vistas generales con Skeletons */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Paneles</h3>
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="col-span-1 shadow-xs border-border/50 flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50 mb-4">
              <CardTitle className="text-sm font-semibold">Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-2 w-full">
                  <Skeleton className="h-4 w-[80%]" />
                  <Skeleton className="h-3 w-[40%]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 shadow-xs border-border/50 flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50 mb-4">
              <CardTitle className="text-sm font-semibold">Calendario (Próximos días)</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              <div className="p-3 border border-border rounded-lg bg-card space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-[70%]" />
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 shadow-xs border-border/50 flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50 mb-4">
              <CardTitle className="text-sm font-semibold">Últimos Proyectos</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
               {recentProjects.length > 0 ? recentProjects.map(p => (
                 <div key={p.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold text-xs">
                        {p.name.substring(0,2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{p.name}</span>
                   </div>
                   <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-sm">{p.status}</span>
                 </div>
               )) : (
                 <p className="text-sm text-muted-foreground text-center mt-8">No hay proyectos.</p>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
