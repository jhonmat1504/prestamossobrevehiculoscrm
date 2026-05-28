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
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Car, CircleDot, CheckCircle2 } from "lucide-react";
import { useCrm, formatCOP, type Vehiculo, type VehiculoEstado } from "@/lib/crm-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/vehiculos")({
  head: () => ({ meta: [{ title: "Vehículos — Freddy CRM" }] }),
  component: VehiculosPage,
});

const estados: VehiculoEstado[] = ["Disponible", "Empeñado", "Vendido"];
const CURRENT_YEAR = new Date().getFullYear();
const empty = {
  placa: "", marca: "", modelo: "", anio: CURRENT_YEAR, color: "",
  kilometraje: 0, precioCompra: 0, precioVenta: 0,
  estado: "Disponible" as VehiculoEstado, notas: "",
};
const PAGE_SIZE = 10;

const vehiculoSchema = z.object({
  placa: z.string().trim().min(4, "Placa muy corta").max(10, "Placa muy larga")
    .regex(/^[A-Z0-9\-]+$/, "Solo letras mayúsculas, números o guion"),
  marca: z.string().trim().min(2, "Marca requerida").max(40),
  modelo: z.string().trim().min(1, "Modelo requerido").max(40),
  anio: z.number().int().min(1950, "Año inválido").max(CURRENT_YEAR + 1, "Año futuro inválido"),
  color: z.string().trim().max(30).optional().or(z.literal("")),
  kilometraje: z.number().int().min(0, "No puede ser negativo").max(2_000_000),
  precioCompra: z.number().min(0, "No puede ser negativo").max(1e10),
  precioVenta: z.number().min(0, "No puede ser negativo").max(1e10),
  estado: z.enum(["Disponible", "Empeñado", "Vendido"]),
  notas: z.string().max(500).optional().or(z.literal("")),
});

function VehiculosPage() {
  const { vehiculos, addVehiculo, updateVehiculo, deleteVehiculo, loading } = useCrm();
  const { isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Vehiculo | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const counts = useMemo(() => ({
    total: vehiculos.length,
    Disponible: vehiculos.filter((v) => v.estado === "Disponible").length,
    Empeñado: vehiculos.filter((v) => v.estado === "Empeñado").length,
    Vendido: vehiculos.filter((v) => v.estado === "Vendido").length,
  }), [vehiculos]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return vehiculos.filter((v) =>
      (filterEstado === "todos" || v.estado === filterEstado) &&
      (!s || v.placa.toLowerCase().includes(s) || v.marca.toLowerCase().includes(s) || v.modelo.toLowerCase().includes(s) || v.color.toLowerCase().includes(s))
    );
  }, [vehiculos, q, filterEstado]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openNew = () => { setEditing(null); setForm(empty); setErrors({}); setOpen(true); };
  const openEdit = (v: Vehiculo) => { setEditing(v); setForm({ ...v }); setErrors({}); setOpen(true); };

  const save = async () => {
    const parsed = vehiculoSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[String(i.path[0])] = i.message; });
      setErrors(errs);
      return;
    }
    // Cross-field rule: precio venta debería ser >= precio compra para disponibles/vendidos
    if (parsed.data.estado === "Vendido" && parsed.data.precioVenta <= 0) {
      setErrors({ precioVenta: "Vehículo vendido requiere precio de venta" });
      return;
    }
    const data = {
      placa: parsed.data.placa,
      marca: parsed.data.marca,
      modelo: parsed.data.modelo,
      anio: parsed.data.anio,
      color: parsed.data.color ?? "",
      kilometraje: parsed.data.kilometraje,
      precioCompra: parsed.data.precioCompra,
      precioVenta: parsed.data.precioVenta,
      estado: parsed.data.estado,
      notas: parsed.data.notas ?? "",
    };
    try {
      if (editing) { await updateVehiculo(editing.id, data); toast.success("Vehículo actualizado"); }
      else { await addVehiculo(data); toast.success("Vehículo registrado"); }
      setOpen(false);
    } catch (e: any) { toast.error(e.message ?? "Error al guardar"); }
  };

  const remove = async (v: Vehiculo) => {
    if (!confirm(`¿Eliminar ${v.placa}? Esta acción no se puede deshacer.`)) return;
    try { await deleteVehiculo(v.id); toast.success("Vehículo eliminado"); }
    catch (e: any) { toast.error(e.message ?? "Error"); }
  };

  const badgeVariant = (e: VehiculoEstado) =>
    e === "Disponible" ? "default" : e === "Empeñado" ? "secondary" : "outline";

  const margen = (v: Vehiculo) => v.precioVenta > 0 ? v.precioVenta - v.precioCompra : 0;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Parque Automotor"
        description="Inventario completo con control de estado y márgenes."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nuevo vehículo</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? "Editar vehículo" : "Nuevo vehículo"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Field label="Placa *" error={errors.placa}>
                  <Input value={form.placa} maxLength={10} onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })} placeholder="ABC123" />
                </Field>
                <Field label="Marca *" error={errors.marca}>
                  <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
                </Field>
                <Field label="Modelo *" error={errors.modelo}>
                  <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
                </Field>
                <Field label="Año *" error={errors.anio}>
                  <Input type="number" min={1950} max={CURRENT_YEAR + 1} value={form.anio} onChange={(e) => setForm({ ...form, anio: +e.target.value })} />
                </Field>
                <Field label="Color" error={errors.color}>
                  <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </Field>
                <Field label="Kilometraje" error={errors.kilometraje}>
                  <Input type="number" min={0} value={form.kilometraje} onChange={(e) => setForm({ ...form, kilometraje: +e.target.value })} />
                </Field>
                <Field label="Precio compra (COP)" error={errors.precioCompra}>
                  <Input type="number" min={0} value={form.precioCompra} onChange={(e) => setForm({ ...form, precioCompra: +e.target.value })} />
                </Field>
                <Field label="Precio venta (COP)" error={errors.precioVenta}>
                  <Input type="number" min={0} value={form.precioVenta} onChange={(e) => setForm({ ...form, precioVenta: +e.target.value })} />
                </Field>
                <Field label="Estado *">
                  <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as VehiculoEstado })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{estados.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <div className="col-span-2 space-y-1.5 md:col-span-3">
                  <Label>Notas</Label>
                  <Textarea rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Detalles adicionales, accesorios, observaciones..." />
                </div>
              </div>
              {form.precioCompra > 0 && form.precioVenta > 0 && (
                <p className="text-sm text-muted-foreground">
                  Margen estimado: <span className={form.precioVenta - form.precioCompra >= 0 ? "font-semibold text-eco" : "font-semibold text-destructive"}>
                    {formatCOP(form.precioVenta - form.precioCompra)}
                  </span>
                </p>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={save}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Car className="h-4 w-4" />} label="Total" value={counts.total} />
        <StatCard icon={<CircleDot className="h-4 w-4 text-primary" />} label="Disponibles" value={counts.Disponible} />
        <StatCard icon={<CircleDot className="h-4 w-4 text-amber-600" />} label="Empeñados" value={counts["Empeñado"]} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} label="Vendidos" value={counts.Vendido} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar placa, marca, modelo o color..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="w-[300px] pl-8" />
            </div>
            <Select value={filterEstado} onValueChange={(v) => { setFilterEstado(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {estados.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="ml-auto text-sm text-muted-foreground">{filtered.length} de {vehiculos.length}</span>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead className="text-right">KM</TableHead>
                  <TableHead className="text-right">Compra</TableHead>
                  <TableHead className="text-right">Venta</TableHead>
                  <TableHead className="text-right">Margen</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Cargando…</TableCell></TableRow>}
                {!loading && pageRows.length === 0 && <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Sin resultados</TableCell></TableRow>}
                {pageRows.map((v) => {
                  const m = margen(v);
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono font-medium">{v.placa}</TableCell>
                      <TableCell>
                        <div className="font-medium">{v.marca} {v.modelo}</div>
                        <div className="text-xs text-muted-foreground">{v.color || "—"}</div>
                      </TableCell>
                      <TableCell>{v.anio}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.kilometraje.toLocaleString("es-CO")}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCOP(v.precioCompra)}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.precioVenta > 0 ? formatCOP(v.precioVenta) : "—"}</TableCell>
                      <TableCell className={`text-right tabular-nums ${m > 0 ? "text-eco" : m < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {m !== 0 ? formatCOP(m) : "—"}
                      </TableCell>
                      <TableCell><Badge variant={badgeVariant(v.estado)}>{v.estado}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(v)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        {isAdmin && <Button variant="ghost" size="icon" onClick={() => remove(v)} title="Eliminar"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
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

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}
