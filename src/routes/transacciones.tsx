import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useCrm, formatCOP, type Transaccion, type TransaccionTipo, type TransaccionEstado } from "@/lib/crm-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/transacciones")({
  head: () => ({ meta: [{ title: "Transacciones — Freddy CRM" }] }),
  component: TransaccionesPage,
});

const tipos: TransaccionTipo[] = ["Compra", "Venta", "Préstamo"];
const estados: TransaccionEstado[] = ["Pendiente", "Vigente", "Completada", "Vencida"];
const empty = {
  tipo: "Venta" as TransaccionTipo, monto: 0, fecha: new Date().toISOString().slice(0, 10),
  estado: "Pendiente" as TransaccionEstado, clienteId: "", vehiculoId: "", vencimiento: "", notas: "",
};

function TransaccionesPage() {
  const { transacciones, clientes, vehiculos, addTransaccion, updateTransaccion, deleteTransaccion, loading } = useCrm();
  const { isAdmin } = useAuth();
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [editing, setEditing] = useState<Transaccion | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const filtered = useMemo(
    () => transacciones.filter((t) => filterTipo === "todos" || t.tipo === filterTipo),
    [transacciones, filterTipo]
  );

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (t: Transaccion) => {
    setEditing(t);
    setForm({
      tipo: t.tipo, monto: t.monto, fecha: t.fecha, estado: t.estado,
      clienteId: t.clienteId, vehiculoId: t.vehiculoId,
      vencimiento: t.vencimiento ?? "", notas: t.notas ?? "",
    });
    setOpen(true);
  };
  const save = async () => {
    if (!form.clienteId || !form.vehiculoId) { toast.error("Cliente y vehículo son obligatorios"); return; }
    try {
      const payload = { ...form, vencimiento: form.vencimiento || undefined };
      if (editing) { await updateTransaccion(editing.id, payload); toast.success("Transacción actualizada"); }
      else { await addTransaccion(payload); toast.success("Transacción registrada"); }
      setOpen(false);
    } catch (e: any) { toast.error(e.message ?? "Error al guardar"); }
  };
  const remove = async (t: Transaccion) => {
    if (!confirm("¿Eliminar transacción?")) return;
    try { await deleteTransaccion(t.id); toast.success("Eliminada"); }
    catch (e: any) { toast.error(e.message ?? "Error"); }
  };

  const tipoBadge = (t: TransaccionTipo) =>
    t === "Compra" ? "secondary" : t === "Venta" ? "default" : "outline";
  const estadoBadge = (e: TransaccionEstado) =>
    e === "Vencida" ? "destructive" : e === "Completada" ? "default" : e === "Vigente" ? "secondary" : "outline";

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Operaciones Financieras" description="Compras, ventas y préstamos sobre vehículos."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nueva transacción</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? "Editar transacción" : "Nueva transacción"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TransaccionTipo })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tipos.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Estado</Label>
                  <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as TransaccionEstado })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{estados.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5"><Label>Cliente</Label>
                  <Select value={form.clienteId} onValueChange={(v) => setForm({ ...form, clienteId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger>
                    <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre} · {c.cedula}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5"><Label>Vehículo</Label>
                  <Select value={form.vehiculoId} onValueChange={(v) => setForm({ ...form, vehiculoId: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona un vehículo" /></SelectTrigger>
                    <SelectContent>{vehiculos.map((v) => <SelectItem key={v.id} value={v.id}>{v.placa} · {v.marca} {v.modelo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Monto (COP)</Label><Input type="number" value={form.monto} onChange={(e) => setForm({ ...form, monto: +e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Vencimiento (opcional, para préstamos)</Label><Input type="date" value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })} /></div>
                <div className="col-span-2 space-y-1.5"><Label>Notas</Label><Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={save}>Guardar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Label className="text-sm">Filtrar:</Label>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tipos.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="ml-auto text-sm text-muted-foreground">{filtered.length} de {transacciones.length}</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Cliente</TableHead>
                <TableHead>Vehículo</TableHead><TableHead>Monto</TableHead>
                <TableHead>Vence</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Cargando…</TableCell></TableRow>}
                {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Sin transacciones</TableCell></TableRow>}
                {filtered.map((t) => {
                  const cli = clientes.find((c) => c.id === t.clienteId);
                  const veh = vehiculos.find((v) => v.id === t.vehiculoId);
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{t.fecha}</TableCell>
                      <TableCell><Badge variant={tipoBadge(t.tipo)}>{t.tipo}</Badge></TableCell>
                      <TableCell className="max-w-[160px] truncate">{cli?.nombre ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{veh?.placa ?? "—"}</TableCell>
                      <TableCell className="font-medium">{formatCOP(t.monto)}</TableCell>
                      <TableCell>{t.vencimiento ?? "—"}</TableCell>
                      <TableCell><Badge variant={estadoBadge(t.estado)}>{t.estado}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                        {isAdmin && <Button variant="ghost" size="icon" onClick={() => remove(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
