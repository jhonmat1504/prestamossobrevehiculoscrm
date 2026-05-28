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
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useCrm, formatCOP, type Vehiculo, type VehiculoEstado } from "@/lib/crm-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/vehiculos")({
  head: () => ({ meta: [{ title: "Vehículos — Freddy CRM" }] }),
  component: VehiculosPage,
});

const estados: VehiculoEstado[] = ["Disponible", "Empeñado", "Vendido"];
const empty = { placa: "", marca: "", modelo: "", anio: new Date().getFullYear(), color: "", kilometraje: 0, precioCompra: 0, precioVenta: 0, estado: "Disponible" as VehiculoEstado, notas: "" };

function VehiculosPage() {
  const { vehiculos, addVehiculo, updateVehiculo, deleteVehiculo, loading } = useCrm();
  const { isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [filterEstado, setFilterEstado] = useState<string>("todos");
  const [editing, setEditing] = useState<Vehiculo | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return vehiculos.filter((v) =>
      (filterEstado === "todos" || v.estado === filterEstado) &&
      (!s || v.placa.toLowerCase().includes(s) || v.marca.toLowerCase().includes(s) || v.modelo.toLowerCase().includes(s))
    );
  }, [vehiculos, q, filterEstado]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (v: Vehiculo) => { setEditing(v); setForm({ ...v }); setOpen(true); };
  const save = async () => {
    try {
      if (editing) { await updateVehiculo(editing.id, form); toast.success("Vehículo actualizado"); }
      else { await addVehiculo(form); toast.success("Vehículo registrado"); }
      setOpen(false);
    } catch (e: any) { toast.error(e.message ?? "Error al guardar"); }
  };
  const remove = async (v: Vehiculo) => {
    if (!confirm(`¿Eliminar ${v.placa}?`)) return;
    try { await deleteVehiculo(v.id); toast.success("Vehículo eliminado"); }
    catch (e: any) { toast.error(e.message ?? "Error"); }
  };

  const badgeVariant = (e: VehiculoEstado) =>
    e === "Disponible" ? "default" : e === "Empeñado" ? "secondary" : "outline";

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Parque Automotor" description="Inventario completo de vehículos."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nuevo vehículo</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editing ? "Editar vehículo" : "Nuevo vehículo"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="space-y-1.5"><Label>Placa</Label><Input value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })} /></div>
                <div className="space-y-1.5"><Label>Marca</Label><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Modelo</Label><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Año</Label><Input type="number" value={form.anio} onChange={(e) => setForm({ ...form, anio: +e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Color</Label><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Kilometraje</Label><Input type="number" value={form.kilometraje} onChange={(e) => setForm({ ...form, kilometraje: +e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Precio compra</Label><Input type="number" value={form.precioCompra} onChange={(e) => setForm({ ...form, precioCompra: +e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Precio venta</Label><Input type="number" value={form.precioVenta} onChange={(e) => setForm({ ...form, precioVenta: +e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Estado</Label>
                  <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as VehiculoEstado })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{estados.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5 md:col-span-3"><Label>Notas</Label><Textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={save}>Guardar</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Placa, marca o modelo..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {estados.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="ml-auto text-sm text-muted-foreground">{filtered.length} de {vehiculos.length}</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Placa</TableHead><TableHead>Vehículo</TableHead><TableHead>Año</TableHead>
                <TableHead>KM</TableHead><TableHead>Compra</TableHead><TableHead>Venta</TableHead>
                <TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Cargando…</TableCell></TableRow>}
                {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Sin resultados</TableCell></TableRow>}
                {filtered.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono font-medium">{v.placa}</TableCell>
                    <TableCell>{v.marca} {v.modelo} · {v.color}</TableCell>
                    <TableCell>{v.anio}</TableCell>
                    <TableCell>{v.kilometraje.toLocaleString("es-CO")}</TableCell>
                    <TableCell>{formatCOP(v.precioCompra)}</TableCell>
                    <TableCell>{formatCOP(v.precioVenta)}</TableCell>
                    <TableCell><Badge variant={badgeVariant(v.estado)}>{v.estado}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                      {isAdmin && <Button variant="ghost" size="icon" onClick={() => remove(v)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
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
