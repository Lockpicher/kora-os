import ImportClient from "@/components/products/import-client"

export const metadata = {
  title: "Importar Catálogo | KORA OS",
}

export default function ImportPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Importación Masiva de Catálogo</h2>
      </div>
      
      <p className="text-muted-foreground mb-6">
        Sube un archivo CSV para poblar tu Catálogo Maestro. Esta operación agrupará las variantes bajo sus respectivos productos de forma inteligente.
      </p>

      <ImportClient />
    </div>
  )
}
