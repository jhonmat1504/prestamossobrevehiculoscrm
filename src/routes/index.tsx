import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users, Car, Wallet, Receipt, Leaf, FileText, AlertTriangle, TrendingUp, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCrm, formatCOP } from "@/lib/crm-store";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Freddy CRM" },
      { name: "description", content: "Panel de control con KPIs en tiempo real, métricas ODS y alertas." },
    ],
  }),
  component: Dashboard,
});

function KpiCard({
  icon: Icon, label, value, hint, accent = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  accent?: "primary" | "success" | "warning" | "eco";
}) {
  const accentMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    eco: "bg-eco/10 text-eco",
  } as const;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accentMap[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { clientes, vehiculos, transacciones, hojasAhorradas, procesosDigitalizados } = useCrm();

  const activos = clientes.filter((c) => c.estado === "Activo").length;
  const disponibles = vehiculos.filter((v) => v.estado === "Disponible");
  const empenados = vehiculos.filter((v) => v.estado === "Empeñado");
  const vendidos = vehiculos.filter((v) => v.estado === "Vendido");
  const valorInventario = disponibles.reduce((s, v) => s + (v.precioVenta || v.precioCompra), 0);

  const mes = new Date().toISOString().slice(0, 7);
  const txMes = transacciones.filter((t) => t.fecha.startsWith(mes));
  const prestamosVigentes = transacciones.filter((t) => t.tipo === "Préstamo" && t.estado === "Vigente");

  const hoy = new Date();
  const enDias = (d: string) => Math.ceil((new Date(d).getTime() - hoy.getTime()) / 86400000);
  const porVencer = prestamosVigentes
    .filter((t) => t.vencimiento && enDias(t.vencimiento) <= 15)
    .sort((a, b) => (a.vencimiento! < b.vencimiento! ? -1 : 1));

  // ODS meta: 2000 hojas (~4 resmas)
  const metaHojas = 2000;
  const progresoOds = Math.min(100, Math.round((hojasAhorradas / metaHojas) * 100));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Panel de Control"
        description="Visión general de la operación de Freddy en tiempo real."
        actions={
          <Button asChild>
            <Link to="/transacciones"><Receipt className="mr-2 h-4 w-4" />Nueva transacción</Link>
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Users} label="Clientes activos" value={String(activos)} hint={`${clientes.length} totales registrados`} />
        <KpiCard
          icon={Car}
          label="Vehículos en inventario"
          value={String(vehiculos.length)}
          hint={`${disponibles.length} disp · ${empenados.length} emp · ${vendidos.length} vend`}
          accent="success"
        />
        <KpiCard icon={Wallet} label="Valor de inventario" value={formatCOP(valorInventario)} hint="Vehículos disponibles" accent="primary" />
        <KpiCard icon={TrendingUp} label="Transacciones del mes" value={String(txMes.length)} hint={`${prestamosVigentes.length} préstamos vigentes`} accent="warning" />
      </div>

      {/* ODS + Alertas */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden border-eco/30">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eco/10 text-eco">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Impacto en Sostenibilidad</CardTitle>
                <CardDescription>ODS 12 · Consumo Responsable — Cero Papel</CardDescription>
              </div>
            </div>
            <Badge className="bg-eco text-eco-foreground hover:bg-eco/90">ODS 12 · 8</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat icon={FileText} label="Hojas ahorradas" value={hojasAhorradas.toLocaleString("es-CO")} />
              <Stat icon={Receipt} label="Procesos digitales" value={procesosDigitalizados.toLocaleString("es-CO")} />
              <Stat icon={Leaf} label="Resmas evitadas" value={(hojasAhorradas / 500).toFixed(1)} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Avance hacia meta anual ({metaHojas.toLocaleString("es-CO")} hojas)</span>
                <span className="font-medium text-foreground">{progresoOds}%</span>
              </div>
              <Progress value={progresoOds} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning-foreground" />
              Alertas rápidas
            </CardTitle>
            <CardDescription>Préstamos por vencer y seguimientos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {porVencer.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay préstamos próximos a vencer.</p>
            )}
            {porVencer.map((t) => {
              const cliente = clientes.find((c) => c.id === t.clienteId);
              const veh = vehiculos.find((v) => v.id === t.vehiculoId);
              const dias = enDias(t.vencimiento!);
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{cliente?.nombre ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {veh?.placa} · {formatCOP(t.monto)}
                    </p>
                  </div>
                  <Badge variant={dias <= 7 ? "destructive" : "secondary"}>
                    {dias <= 0 ? "Vencido" : `${dias}d`}
                  </Badge>
                </div>
              );
            })}
            <Button asChild variant="ghost" className="w-full justify-between">
              <Link to="/transacciones">Ver todas <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <QuickLink to="/clientes" icon={Users} label="Clientes" />
        <QuickLink to="/vehiculos" icon={Car} label="Inventario" />
        <QuickLink to="/transacciones" icon={Receipt} label="Transacciones" />
        <QuickLink to="/reportes" icon={TrendingUp} label="Reportes" />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
