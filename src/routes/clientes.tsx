import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useCrm, type Cliente, type ClienteEstado } from "@/lib/crm-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Freddy CRM" }] }),
  component: ClientesPage,
});

const estados: ClienteEstado[] = ["Activo", "Inactivo", "Moroso"];
const empty = { nombre: "", cedula: "", telefono: "", correo: "", direccion: "", estado: "Activo" as ClienteEstado };

function ClientesPage() {
  const { clientes, addCliente, updateCliente, deleteCliente, loading } = useCrm();
  const { isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return clientes.filter((c) => !s || c.nombre.toLowerCase().includes(s) || c.cedula.includes(s) || c.correo.toLowerCase().includes(s));
  }, [clientes, q]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Cliente) => {
    setEditing(c);
    setForm({ nombre: c.nombre, cedula: c.cedula, telefono: c.telefono, correo: c.correo, direccion: c.direccion, estado: c.estado });
    setOpen(true);
  };
  const save = async () => {
    try {
      if (editing) { await updateCliente(editing.id, form); toast.success("Cliente actualizado"); }
      else { await addCliente(form); toast.success("Cliente registrado"); }
      setOpen(false);
    } catch (e: any) { toast.error(e.message ?? "Error al guardar"); }
  };
  const remove = async (c: Cliente) => {
    if (!confirm(`¿Eliminar a ${c.nombre}?`)) return;
    try { await deleteCliente(c.id); toast.success("Cliente eliminado"); }
    catch (e: any) { toast.error(e.message ?? "Error"); }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Clientes" description="Gestión de clientes registrados en el sistema."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nuevo cliente</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5"><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Cédula</Label><Input value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Teléfono</Label><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Correo</Label><Input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Dirección</Label><Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Estado</Label>
                  <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as ClienteEstado })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{estados.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter><Button onClick={save}>Guardar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, cédula o correo..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
            <span className="ml-auto text-sm text-muted-foreground">{filtered.length} de {clientes.length}</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Nombre</TableHead><TableHead>Cédula</TableHead><TableHead>Teléfono</TableHead>
                <TableHead>Correo</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Cargando…</TableCell></TableRow>}
                {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Sin resultados</TableCell></TableRow>}
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell>{c.cedula}</TableCell>
                    <TableCell>{c.telefono}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{c.correo}</TableCell>
                    <TableCell><Badge variant={c.estado === "Moroso" ? "destructive" : c.estado === "Inactivo" ? "secondary" : "default"}>{c.estado}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      {isAdmin && <Button variant="ghost" size="icon" onClick={() => remove(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
