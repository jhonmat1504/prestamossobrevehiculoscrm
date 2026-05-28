import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  HandCoins,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCOP, useCrm, type Transaccion } from "@/lib/crm-store";

export const Route = createFileRoute("/reportes")({
  head: () => ({ meta: [{ title: "Reportes — Freddy CRM" }] }),
  component: ReportesPage,
});

type Periodo = "1m" | "3m" | "6m" | "12m" | "ytd" | "all";

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "1m", label: "Último mes" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "12m", label: "Últimos 12 meses" },
  { value: "ytd", label: "Año actual" },
  { value: "all", label: "Todo el histórico" },
];

function startDate(periodo: Periodo): Date | null {
  const now = new Date();
  switch (periodo) {
    case "1m": return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "3m": return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6m": return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "12m": return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case "ytd": return new Date(now.getFullYear(), 0, 1);
    case "all": return null;
  }
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-CO", { month: "short", year: "2-digit" });
}

function ReportesPage() {
  const { transacciones, vehiculos, clientes, loading } = useCrm();
  const [periodo, setPeriodo] = useState<Periodo>("6m");
  const [costoFijo, setCostoFijo] = useState<number>(1_500_000);
  const [costoVariable, setCostoVariable] = useState<number>(50_000);

  const desde = useMemo(() => startDate(periodo), [periodo]);

  const filtradas = useMemo<Transaccion[]>(() => {
    if (!desde) return transacciones;
    const ts = desde.getTime();
    return transacciones.filter((t) => new Date(t.fecha).getTime() >= ts);
  }, [transacciones, desde]);

  const kpis = useMemo(() => {
    let ingresos = 0;
    let egresos = 0;
    let prestamos = 0;
    for (const t of filtradas) {
      if (t.tipo === "Venta") ingresos += t.monto;
      else if (t.tipo === "Compra") egresos += t.monto;
      else if (t.tipo === "Préstamo") prestamos += t.monto;
    }
    const operativos = costoFijo + costoVariable * filtradas.length;
    const margenBruto = ingresos - egresos;
    const margenNeto = margenBruto - operativos;
    return { ingresos, egresos, prestamos, operativos, margenBruto, margenNeto };
  }, [filtradas, costoFijo, costoVariable]);

  const serieMensual = useMemo(() => {
    const buckets = new Map<string, { mes: string; Compra: number; Venta: number; "Préstamo": number }>();
    const meses: string[] = [];
    const start = desde ?? new Date(Math.min(...(filtradas.length ? filtradas.map((t) => new Date(t.fecha).getTime()) : [Date.now()])));
    const end = new Date();
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const k = monthKey(cursor);
      meses.push(k);
      buckets.set(k, { mes: monthLabel(k), Compra: 0, Venta: 0, "Préstamo": 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    for (const t of filtradas) {
      const k = monthKey(new Date(t.fecha));
      const b = buckets.get(k);
      if (b) b[t.tipo] += t.monto;
    }
    return meses.map((k) => buckets.get(k)!);
  }, [filtradas, desde]);

  const serieMargen = useMemo(() => {
    let acumulado = 0;
    return serieMensual.map((m) => {
      const neto = m.Venta - m.Compra;
      acumulado += neto;
      return { mes: m.mes, Margen: neto, Acumulado: acumulado };
    });
  }, [serieMensual]);

  const distribucion = useMemo(() => {
    return [
      { name: "Ventas", value: kpis.ingresos, color: "hsl(var(--primary))" },
      { name: "Compras", value: kpis.egresos, color: "hsl(var(--destructive))" },
      { name: "Préstamos", value: kpis.prestamos, color: "hsl(var(--muted-foreground))" },
    ].filter((d) => d.value > 0);
  }, [kpis]);

  const topVehiculos = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtradas) {
      if (t.tipo === "Venta") map.set(t.vehiculoId, (map.get(t.vehiculoId) ?? 0) + t.monto);
      else if (t.tipo === "Compra") map.set(t.vehiculoId, (map.get(t.vehiculoId) ?? 0) - t.monto);
    }
    return Array.from(map.entries())
      .map(([id, margen]) => {
        const v = vehiculos.find((x) => x.id === id);
        return { id, margen, placa: v?.placa ?? "—", descripcion: v ? `${v.marca} ${v.modelo}` : "Vehículo eliminado" };
      })
      .sort((a, b) => b.margen - a.margen)
      .slice(0, 5);
  }, [filtradas, vehiculos]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Reportes"
        description="Movimientos financieros, márgenes estimados y costos operativos del periodo."
        actions={
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      {loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Cargando reportes…</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Kpi icon={<ArrowUpCircle className="h-4 w-4 text-eco" />} label="Ingresos (Ventas)" value={formatCOP(kpis.ingresos)} />
            <Kpi icon={<ArrowDownCircle className="h-4 w-4 text-destructive" />} label="Egresos (Compras)" value={formatCOP(kpis.egresos)} />
            <Kpi icon={<HandCoins className="h-4 w-4 text-amber-600" />} label="Préstamos" value={formatCOP(kpis.prestamos)} />
            <Kpi icon={<Wallet className="h-4 w-4 text-muted-foreground" />} label="Costos operativos" value={formatCOP(kpis.operativos)} />
            <Kpi icon={<TrendingUp className="h-4 w-4 text-primary" />} label="Margen bruto" value={formatCOP(kpis.margenBruto)} tone={kpis.margenBruto >= 0 ? "pos" : "neg"} />
            <Kpi icon={<TrendingUp className="h-4 w-4 text-primary" />} label="Margen neto" value={formatCOP(kpis.margenNeto)} tone={kpis.margenNeto >= 0 ? "pos" : "neg"} />
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Costos operativos del periodo</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="cfijo">Costo fijo (COP)</Label>
                <Input id="cfijo" type="number" min={0} value={costoFijo}
                  onChange={(e) => setCostoFijo(Math.max(0, Number(e.target.value) || 0))} />
                <p className="text-xs text-muted-foreground">Arriendo, salarios, servicios.</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cvar">Costo variable por transacción (COP)</Label>
                <Input id="cvar" type="number" min={0} value={costoVariable}
                  onChange={(e) => setCostoVariable(Math.max(0, Number(e.target.value) || 0))} />
                <p className="text-xs text-muted-foreground">Comisiones, trámites, transporte.</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="text-muted-foreground">Cálculo</div>
                <div className="mt-1 font-medium">
                  {formatCOP(costoFijo)} + {filtradas.length} × {formatCOP(costoVariable)}
                </div>
                <div className="mt-1 text-lg font-semibold">{formatCOP(kpis.operativos)}</div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Movimientos por mes</CardTitle></CardHeader>
              <CardContent className="h-[320px]">
                {serieMensual.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serieMensual} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => abbrev(v)} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Venta" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Compra" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Préstamo" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Margen acumulado (Ventas − Compras)</CardTitle></CardHeader>
              <CardContent className="h-[320px]">
                {serieMargen.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={serieMargen} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => abbrev(v)} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="Margen" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Acumulado" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Distribución por tipo</CardTitle></CardHeader>
              <CardContent className="h-[320px]">
                {distribucion.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={distribucion} dataKey="value" nameKey="name" outerRadius={110} label={(e) => e.name}>
                        {distribucion.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Top vehículos por margen</CardTitle></CardHeader>
              <CardContent>
                {topVehiculos.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sin movimientos en el periodo.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Placa</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Margen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topVehiculos.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.placa}</TableCell>
                          <TableCell className="text-muted-foreground">{v.descripcion}</TableCell>
                          <TableCell className={`text-right font-medium ${v.margen >= 0 ? "text-eco" : "text-destructive"}`}>
                            {formatCOP(v.margen)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground">
            Periodo analizado: {filtradas.length} transacciones · {clientes.length} clientes · {vehiculos.length} vehículos registrados.
          </p>
        </>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "pos" | "neg" }) {
  const toneCls = tone === "pos" ? "text-eco" : tone === "neg" ? "text-destructive" : "";
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2 p-4">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`mt-1 truncate text-base font-semibold md:text-lg ${toneCls}`}>{value}</div>
        </div>
        <div className="shrink-0">{icon}</div>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin datos en el periodo seleccionado.</div>;
}

function abbrev(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover p-2 text-xs shadow-md">
      {label && <div className="mb-1 font-medium">{label}</div>}
      {payload.map((p: any) => (
        <div key={p.dataKey ?? p.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color ?? p.payload?.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{formatCOP(Number(p.value) || 0)}</span>
        </div>
      ))}
    </div>
  );
}
