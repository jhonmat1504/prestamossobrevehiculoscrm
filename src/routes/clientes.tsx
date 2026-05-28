import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Eye, ChevronLeft, ChevronRight, Mail, Phone, MapPin, Calendar, Car, DollarSign } from "lucide-react";
import { useCrm, type Cliente, type ClienteEstado, formatCOP } from "@/lib/crm-store";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Freddy CRM" }] }),
  component: ClientesPage,
});

const estados: ClienteEstado[] = ["Activo", "Inactivo", "Moroso"];
const empty = { nombre: "", cedula: "", telefono: "", correo: "", direccion: "", estado: "Activo" as ClienteEstado };
const PAGE_SIZE = 10;

const clienteSchema = z.object({
  nombre: z.string().trim().min(2, "Nombre muy corto").max(120),
  cedula: z.string().trim().min(5, "Cédula inválida").max(20).regex(/^[0-9A-Za-z.\-]+$/, "Solo números/letras"),
  telefono: z.string().trim().max(20).regex(/^[0-9+\-\s()]*$/, "Teléfono inválido").optional().or(z.literal("")),
  correo: z.string().trim().email("Correo inválido").max(150).optional().or(z.literal("")),
  direccion: z.string().trim().max(200).optional().or(z.literal("")),
  estado: z.enum(["Activo", "Inactivo", "Moroso"]),
});

function ClientesPage() {
  const { clientes, vehiculos, transacciones, addCliente, updateCliente, deleteCliente, loading } = useCrm();
  const { isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<ClienteEstado | "Todos">("Todos");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<Cliente | null>(null);

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    return clientes.filter((c) => {
      if (estadoFilter !== "Todos" && c.estado !== estadoFilter) return false;
      if (!s) return true;
      return (
        c.nombre.toLowerCase().includes(s) ||
        c.cedula.toLowerCase().includes(s) ||
        c.correo.toLowerCase().includes(s) ||
        c.telefono.toLowerCase().includes(s)
      );
    });
  }, [clientes, q, estadoFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openNew = () => { setEditing(null); setForm(empty); setErrors({}); setOpen(true); };
  const openEdit = (c: Cliente) => {
    setEditing(c);
    setForm({ nombre: c.nombre, cedula: c.cedula, telefono: c.telefono, correo: c.correo, direccion: c.direccion, estado: c.estado });
    setErrors({});
    setOpen(true);
  };

  const save = async () => {
    const parsed = clienteSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[String(i.path[0])] = i.message; });
      setErrors(errs);
      return;
    }
    try {
      const data = {
        nombre: parsed.data.nombre,
        cedula: parsed.data.cedula,
        telefono: parsed.data.telefono ?? "",
        correo: parsed.data.correo ?? "",
        direccion: parsed.data.direccion ?? "",
        estado: parsed.data.estado,
      };
      if (editing) { await updateCliente(editing.id, data); toast.success("Cliente actualizado"); }
      else { await addCliente(data); toast.success("Cliente registrado"); }
      setOpen(false);
    } catch (e: any) { toast.error(e.message ?? "Error al guardar"); }
  };

  const remove = async (c: Cliente) => {
    if (!confirm(`¿Eliminar a ${c.nombre}? Esta acción no se puede deshacer.`)) return;
    try { await deleteCliente(c.id); toast.success("Cliente eliminado"); }
    catch (e: any) { toast.error(e.message ?? "Error"); }
  };

  // Timeline data for selected client
  const clienteTimeline = useMemo(() => {
    if (!detail) return [];
    const txs = transacciones
      .filter((t) => t.clienteId === detail.id)
      .map((t) => {
        const v = vehiculos.find((x) => x.id === t.vehiculoId);
        return {
          id: t.id,
          fecha: t.fecha,
          tipo: t.tipo,
          monto: t.monto,
          estado: t.estado,
          vencimiento: t.vencimiento,
          notas: t.notas,
          vehiculo: v ? `${v.marca} ${v.modelo} (${v.placa})` : "—",
        };
      })
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    return txs;
  }, [detail, transacciones, vehiculos]);

  const totales = useMemo(() => {
    if (!detail) return { total: 0, compras: 0, ventas: 0, prestamos: 0, montoTotal: 0 };
    const txs = transacciones.filter((t) => t.clienteId === detail.id);
    return {
      total: txs.length,
      compras: txs.filter((t) => t.tipo === "Compra").length,
      ventas: txs.filter((t) => t.tipo === "Venta").length,
      prestamos: txs.filter((t) => t.tipo === "Préstamo").length,
      montoTotal: txs.reduce((s, t) => s + t.monto, 0),
    };
  }, [detail, transacciones]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Clientes"
        description="Gestión integral de clientes con historial completo de operaciones."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nuevo cliente</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Nombre completo *</Label>
                  <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                  {errors.nombre && <p className="text-xs text-destructive">{errors.nombre}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Cédula *</Label>
                  <Input value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} />
                  {errors.cedula && <p className="text-xs text-destructive">{errors.cedula}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Teléfono</Label>
                  <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                  {errors.telefono && <p className="text-xs text-destructive">{errors.telefono}</p>}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Correo</Label>
                  <Input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
                  {errors.correo && <p className="text-xs text-destructive">{errors.correo}</p>}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Dirección</Label>
                  <Textarea rows={2} value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as ClienteEstado })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{estados.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
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

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, cédula, correo o teléfono..."
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                className="w-[320px] pl-8"
              />
            </div>
            <Select value={estadoFilter} onValueChange={(v) => { setEstadoFilter(v as any); setPage(1); }}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos los estados</SelectItem>
                {estados.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="ml-auto text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "cliente" : "clientes"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registrado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Cargando…</TableCell></TableRow>}
                {!loading && pageRows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Sin resultados</TableCell></TableRow>
                )}
                {pageRows.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => setDetail(c)}>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell className="font-mono text-xs">{c.cedula}</TableCell>
                    <TableCell>
                      <div className="text-sm">{c.telefono || "—"}</div>
                      <div className="max-w-[200px] truncate text-xs text-muted-foreground">{c.correo || "—"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.estado === "Moroso" ? "destructive" : c.estado === "Inactivo" ? "secondary" : "default"}>
                        {c.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.createdAt}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => setDetail(c)} title="Ver historial">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => remove(c)} title="Eliminar">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
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

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {detail.nombre}
                  <Badge variant={detail.estado === "Moroso" ? "destructive" : detail.estado === "Inactivo" ? "secondary" : "default"}>
                    {detail.estado}
                  </Badge>
                </SheetTitle>
                <SheetDescription>Ficha del cliente e historial de operaciones</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Datos de contacto</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> Cédula: <span className="font-mono">{detail.cedula}</span></div>
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {detail.telefono || "Sin teléfono"}</div>
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {detail.correo || "Sin correo"}</div>
                    <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" /> {detail.direccion || "Sin dirección"}</div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-4 gap-2">
                  <Card><CardContent className="p-3 text-center"><div className="text-2xl font-semibold">{totales.total}</div><div className="text-xs text-muted-foreground">Operaciones</div></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><div className="text-2xl font-semibold">{totales.compras}</div><div className="text-xs text-muted-foreground">Compras</div></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><div className="text-2xl font-semibold">{totales.ventas}</div><div className="text-xs text-muted-foreground">Ventas</div></CardContent></Card>
                  <Card><CardContent className="p-3 text-center"><div className="text-2xl font-semibold">{totales.prestamos}</div><div className="text-xs text-muted-foreground">Préstamos</div></CardContent></Card>
                </div>

                <Card>
                  <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-sm">Línea de tiempo</CardTitle>
                      <CardDescription className="text-xs">Total movido: {formatCOP(totales.montoTotal)}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {clienteTimeline.length === 0 && (
                      <p className="py-6 text-center text-sm text-muted-foreground">Sin transacciones registradas</p>
                    )}
                    <ol className="relative space-y-4 border-l border-border pl-5">
                      {clienteTimeline.map((t) => (
                        <li key={t.id} className="relative">
                          <span className="absolute -left-[26px] flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-background">
                            {t.tipo === "Compra" && <DollarSign className="h-2.5 w-2.5 text-primary-foreground" />}
                            {t.tipo === "Venta" && <Car className="h-2.5 w-2.5 text-primary-foreground" />}
                            {t.tipo === "Préstamo" && <Calendar className="h-2.5 w-2.5 text-primary-foreground" />}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{t.tipo}</Badge>
                            <Badge variant={t.estado === "Vencida" ? "destructive" : t.estado === "Completada" ? "secondary" : "default"} className="text-xs">
                              {t.estado}
                            </Badge>
                            <span className="ml-auto text-xs text-muted-foreground">{t.fecha}</span>
                          </div>
                          <p className="mt-1 text-sm font-medium">{formatCOP(t.monto)}</p>
                          <p className="text-xs text-muted-foreground">{t.vehiculo}</p>
                          {t.vencimiento && <p className="text-xs text-muted-foreground">Vence: {t.vencimiento}</p>}
                          {t.notas && <p className="mt-1 text-xs italic text-muted-foreground">"{t.notas}"</p>}
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { openEdit(detail); setDetail(null); }}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </Button>
                  {isAdmin && (
                    <Button variant="destructive" className="flex-1" onClick={() => { remove(detail); setDetail(null); }}>
                      <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
