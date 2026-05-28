import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
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
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Search, ShoppingCart, Banknote, HandCoins } from "lucide-react";
import { useCrm, formatCOP, type Transaccion, type TransaccionTipo, type TransaccionEstado } from "@/lib/crm-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/transacciones")({
  head: () => ({ meta: [{ title: "Transacciones — Freddy CRM" }] }),
  component: TransaccionesPage,
});

const tipos: TransaccionTipo[] = ["Compra", "Venta", "Préstamo"];
const estados: TransaccionEstado[] = ["Pendiente", "Vigente", "Completada", "Vencida"];
const today = () => new Date().toISOString().slice(0, 10);
const empty = {
  tipo: "Venta" as TransaccionTipo, monto: 0, fecha: today(),
  estado: "Pendiente" as TransaccionEstado, clienteId: "", vehiculoId: "",
  vencimiento: "", notas: "",
};
const PAGE_SIZE = 10;

const txSchema = z.object({
  tipo: z.enum(["Compra", "Venta", "Préstamo"]),
  monto: z.number().min(1, "Monto debe ser mayor a 0").max(1e10),
  fecha: z.string().min(1, "Fecha requerida"),
  estado: z.enum(["Pendiente", "Vigente", "Completada", "Vencida"]),
  clienteId: z.string().uuid("Selecciona un cliente"),
  vehiculoId: z.string().uuid("Selecciona un vehículo"),
  vencimiento: z.string().optional().or(z.literal("")),
  notas: z.string().max(500).optional().or(z.literal("")),
}).refine((d) => d.tipo !== "Préstamo" || (d.vencimiento && d.vencimiento.length > 0), {
  message: "Préstamo requiere fecha de vencimiento",
  path: ["vencimiento"],
}).refine((d) => !d.vencimiento || d.vencimiento >= d.fecha, {
  message: "Vencimiento no puede ser anterior a la fecha",
  path: ["vencimiento"],
});

function TransaccionesPage() {
  const { transacciones, clientes, vehiculos, addTransaccion, updateTransaccion, deleteTransaccion, loading } = useCrm();
  const { isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Transaccion | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const counts = useMemo(() => ({
    total: transacciones.length,
    compras: transacciones.filter((t) => t.tipo === "Compra").length,
    ventas: transacciones.filter((t) => t.tipo === "Venta").length,
    prestamos: transacciones.filter((t) => t.tipo === "Préstamo").length,
    montoTotal: transacciones.reduce((s, t) => s + t.monto, 0),
  }), [transacciones]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return transacciones.filter((t) => {
      if (filterTipo !== "todos" && t.tipo !== filterTipo) return false;
      if (filterEstado !== "todos" && t.estado !== filterEstado) return false;
      if (fechaDesde && t.fecha < fechaDesde) return false;
      if (fechaHasta && t.fecha > fechaHasta) return false;
      if (s) {
        const cli = clientes.find((c) => c.id === t.clienteId);
        const veh = vehiculos.find((v) => v.id === t.vehiculoId);
        const hay = `${cli?.nombre ?? ""} ${cli?.cedula ?? ""} ${veh?.placa ?? ""} ${veh?.marca ?? ""} ${veh?.modelo ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [transacciones, filterTipo, filterEstado, fechaDesde, fechaHasta, q, clientes, vehiculos]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openNew = () => { setEditing(null); setForm(empty); setErrors({}); setOpen(true); };
  const openEdit = (t: Transaccion) => {
    setEditing(t);
    setForm({
      tipo: t.tipo, monto: t.monto, fecha: t.fecha, estado: t.estado,
      clienteId: t.clienteId, vehiculoId: t.vehiculoId,
      vencimiento: t.vencimiento ?? "", notas: t.notas ?? "",
    });
    setErrors({});
    setOpen(true);
  };

  const save = async () => {
    const parsed = txSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[String(i.path[0])] = i.message; });
      setErrors(errs);
      return;
    }
    const data = {
      ...parsed.data,
      vencimiento: parsed.data.vencimiento || undefined,
      notas: parsed.data.notas || undefined,
    };
    try {
      if (editing) { await updateTransaccion(editing.id, data); toast.success("Transacción actualizada"); }
      else { await addTransaccion(data); toast.success("Transacción registrada"); }
      setOpen(false);
    } catch (e: any) { toast.error(e.message ?? "Error al guardar"); }
  };

  const remove = async (t: Transaccion) => {
    if (!confirm("¿Eliminar esta transacción? No se puede deshacer.")) return;
    try { await deleteTransaccion(t.id); toast.success("Eliminada"); }
    catch (e: any) { toast.error(e.message ?? "Error"); }
  };

  const tipoBadge = (t: TransaccionTipo) =>
    t === "Compra" ? "secondary" : t === "Venta" ? "default" : "outline";
  const estadoBadge = (e: TransaccionEstado) =>
    e === "Vencida" ? "destructive" : e === "Completada" ? "default" : e === "Vigente" ? "secondary" : "outline";

  const clearFilters = () => {
    setQ(""); setFilterTipo("todos"); setFilterEstado("todos");
    setFechaDesde(""); setFechaHasta(""); setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Operaciones Financieras"
        description="Compras, ventas y préstamos sobre vehículos con trazabilidad completa."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nueva transacción</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? "Editar transacción" : "Nueva transacción"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo *">
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TransaccionTipo })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tipos.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Estado *">
                  <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as TransaccionEstado })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{estados.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <div className="col-span-2">
                  <Field label="Cliente *" error={errors.clienteId}>
                    <Select value={form.clienteId} onValueChange={(v) => setForm({ ...form, clienteId: v })}>
                      <SelectTrigger><SelectValue placeholder={clientes.length === 0 ? "Registra clientes primero" : "Selecciona un cliente"} /></SelectTrigger>
                      <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre} · {c.cedula}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Vehículo *" error={errors.vehiculoId}>
                    <Select value={form.vehiculoId} onValueChange={(v) => setForm({ ...form, vehiculoId: v })}>
                      <SelectTrigger><SelectValue placeholder={vehiculos.length === 0 ? "Registra vehículos primero" : "Selecciona un vehículo"} /></SelectTrigger>
                      <SelectContent>{vehiculos.map((v) => <SelectItem key={v.id} value={v.id}>{v.placa} · {v.marca} {v.modelo} ({v.estado})</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Monto (COP) *" error={errors.monto}>
                  <Input type="number" min={0} value={form.monto} onChange={(e) => setForm({ ...form, monto: +e.target.value })} />
                </Field>
                <Field label="Fecha *" error={errors.fecha}>
                  <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                </Field>
                <div className="col-span-2">
                  <Field label={form.tipo === "Préstamo" ? "Vencimiento * (obligatorio para préstamos)" : "Vencimiento (opcional)"} error={errors.vencimiento}>
                    <Input type="date" value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })} />
                  </Field>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Notas</Label>
                  <Textarea rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Condiciones, cuotas, observaciones..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={save}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />} label="Compras" value={counts.compras} />
        <StatCard icon={<Banknote className="h-4 w-4 text-eco" />} label="Ventas" value={counts.ventas} />
        <StatCard icon={<HandCoins className="h-4 w-4 text-amber-600" />} label="Préstamos" value={counts.prestamos} />
        <StatCard icon={null} label="Monto total" value={formatCOP(counts.montoTotal)} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cliente, cédula, placa..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="w-[240px] pl-8" />
            </div>
            <Select value={filterTipo} onValueChange={(v) => { setFilterTipo(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {tipos.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={(v) => { setFilterEstado(v); setPage(1); }}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {estados.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={fechaDesde} onChange={(e) => { setFechaDesde(e.target.value); setPage(1); }} className="w-[150px]" title="Desde" />
            <Input type="date" value={fechaHasta} onChange={(e) => { setFechaHasta(e.target.value); setPage(1); }} className="w-[150px]" title="Hasta" />
            {(q || filterTipo !== "todos" || filterEstado !== "todos" || fechaDesde || fechaHasta) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>Limpiar</Button>
            )}
            <span className="ml-auto text-sm text-muted-foreground">{filtered.length} de {transacciones.length}</span>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Cargando…</TableCell></TableRow>}
                {!loading && pageRows.length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Sin transacciones</TableCell></TableRow>}
                {pageRows.map((t) => {
                  const cli = clientes.find((c) => c.id === t.clienteId);
                  const veh = vehiculos.find((v) => v.id === t.vehiculoId);
                  const vencido = t.vencimiento && t.estado === "Vigente" && t.vencimiento < today();
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs tabular-nums">{t.fecha}</TableCell>
                      <TableCell><Badge variant={tipoBadge(t.tipo)}>{t.tipo}</Badge></TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        <div className="font-medium">{cli?.nombre ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{cli?.cedula}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">{veh?.placa ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{veh ? `${veh.marca} ${veh.modelo}` : ""}</div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCOP(t.monto)}</TableCell>
                      <TableCell className={`text-xs tabular-nums ${vencido ? "font-semibold text-destructive" : ""}`}>
                        {t.vencimiento ?? "—"}
                      </TableCell>
                      <TableCell><Badge variant={estadoBadge(t.estado)}>{t.estado}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        {isAdmin && <Button variant="ghost" size="icon" onClick={() => remove(t)} title="Eliminar"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Página {currentPage} de {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                Siguiente <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold md:text-2xl">{value}</div>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}
