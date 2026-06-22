"use client"

import * as React from "react"
import { Plus, Edit, ToggleLeft, ToggleRight, Loader2, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Supplier, createSupplier, updateSupplier, toggleSupplierStatus } from "@/app/(dashboard)/suppliers/actions"
import { useRouter } from "next/navigation"

export default function SuppliersClient({ initialSuppliers }: { initialSuppliers: Supplier[] }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedSupplier, setSelectedSupplier] = React.useState<Supplier | null>(null)
  
  const [name, setName] = React.useState("")
  const [contactName, setContactName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [notes, setNotes] = React.useState("")

  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState("")

  const handleCreateOpen = () => {
    setSelectedSupplier(null)
    setName("")
    setContactName("")
    setPhone("")
    setEmail("")
    setNotes("")
    setErrorMsg("")
    setIsOpen(true)
  }

  const handleEditOpen = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setName(supplier.name)
    setContactName(supplier.contact_name || "")
    setPhone(supplier.phone || "")
    setEmail(supplier.email || "")
    setNotes(supplier.notes || "")
    setErrorMsg("")
    setIsOpen(true)
  }

  const handleToggleStatus = async (supplier: Supplier) => {
    setActionLoadingId(supplier.id)
    const res = await toggleSupplierStatus(supplier.id, supplier.active)
    if (!res.success) {
      alert("Error al cambiar estado: " + res.error)
    } else {
      router.refresh()
    }
    setActionLoadingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg("El nombre de la empresa es obligatorio.")
      return
    }

    setIsSubmitting(true)
    setErrorMsg("")

    const payload = { name, contact_name: contactName, phone, email, notes }
    let res
    if (selectedSupplier) {
      res = await updateSupplier(selectedSupplier.id, payload)
    } else {
      res = await createSupplier(payload)
    }

    if (res.success) {
      setIsOpen(false)
      router.refresh()
    } else {
      setErrorMsg(res.error || "Ocurrió un error al guardar el proveedor.")
    }
    setIsSubmitting(false)
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Proveedores</h2>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Directorio de Proveedores</CardTitle>
            <CardDescription>Gestiona las empresas que abastecen tu inventario.</CardDescription>
          </div>
          <Button onClick={handleCreateOpen} className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo Proveedor
          </Button>
        </CardHeader>
        <CardContent>
          {initialSuppliers.length === 0 ? (
            <div
              onClick={handleCreateOpen}
              className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-12 cursor-pointer text-muted-foreground text-center"
            >
              <Truck className="h-12 w-12 mb-4 text-muted-foreground/60" />
              <p className="font-semibold">No hay proveedores registrados</p>
              <p className="text-sm mt-1">Haz clic para añadir tu primer proveedor.</p>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[100px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialSuppliers.map((s) => {
                    const isItemLoading = actionLoadingId === s.id
                    return (
                      <TableRow key={s.id} className={!s.active ? "opacity-60 bg-muted/20" : ""}>
                        <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground">{s.contact_name || "-"}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">{s.phone || "-"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{s.email || "-"}</TableCell>
                        <TableCell>
                          {s.active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-500 border border-slate-500/20">
                              Inactivo
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isItemLoading}
                              onClick={() => handleEditOpen(s)}
                              className="h-8 w-8 text-foreground"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isItemLoading}
                              onClick={() => handleToggleStatus(s)}
                              className="h-8 w-8"
                            >
                              {isItemLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : s.active ? (
                                <ToggleLeft className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <ToggleRight className="h-5 w-5 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{selectedSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
              <DialogDescription>
                Información comercial y de contacto del proveedor.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Nombre / Empresa *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Nombre Contacto</label>
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Teléfono</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Notas</label>
                <textarea
                  className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {errorMsg && (
                <p className="text-sm font-medium text-destructive">{errorMsg}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
