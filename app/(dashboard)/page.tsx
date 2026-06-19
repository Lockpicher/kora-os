import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Package, Bookmark, FolderTree, ArrowUpRight } from "lucide-react"
import Link from "next/link"

export const revalidate = 0 // Evita que se cacheen las estadísticas y siempre consulte a Supabase

export default async function DashboardPage() {
  const supabase = await createClient()

  // Consultar estadísticas de la base de datos de manera concurrente
  const [productsRes, brandsRes, categoriesRes] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("brands").select("*", { count: "exact", head: true }).eq("active", true),
    supabase.from("categories").select("*", { count: "exact", head: true }).eq("active", true),
  ])

  const stats = [
    {
      title: "Productos Activos",
      value: productsRes.count || 0,
      icon: Package,
      description: "Catálogo maestro",
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      href: "/products",
    },
    {
      title: "Marcas Activas",
      value: brandsRes.count || 0,
      icon: Bookmark,
      description: "Marcas Grupo Kubbonet",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "/brands",
    },
    {
      title: "Categorías Activas",
      value: categoriesRes.count || 0,
      icon: FolderTree,
      description: "Estructura de catálogo",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      href: "/categories",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-2">
          Bienvenido a KORA OS. Aquí tienes un resumen del estado de tu catálogo maestro.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="hover:border-primary/50 transition-colors duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bg} p-2 rounded-md`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">{stat.description}</span>
                  <Link
                    href={stat.href}
                    className="text-xs text-primary hover:underline flex items-center"
                  >
                    Ver detalles <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Info panel */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Estado de Integración de Base de Datos</CardTitle>
          <CardDescription>
            Conexión en vivo con el backend de Supabase PostgreSQL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3 text-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-muted-foreground">Conectado a la base de datos de Supabase.</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Esta versión inicial de KORA OS (Fase 1A) lee directamente los productos, marcas y categorías
            creados en tu instancia de Supabase. El menú lateral te permite gestionar cada uno de estos
            módulos en tiempo real.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
