import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type ClienteEstado = "Activo" | "Inactivo" | "Moroso";
export interface Cliente {
  id: string;
  nombre: string;
  cedula: string;
  telefono: string;
  correo: string;
  direccion: string;
  estado: ClienteEstado;
  createdAt: string;
}

export type VehiculoEstado = "Disponible" | "Empeñado" | "Vendido";
export interface Vehiculo {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  color: string;
  kilometraje: number;
  precioCompra: number;
  precioVenta: number;
  estado: VehiculoEstado;
  notas: string;
}

export type TransaccionTipo = "Compra" | "Venta" | "Préstamo";
export type TransaccionEstado = "Pendiente" | "Vigente" | "Completada" | "Vencida";
export interface Transaccion {
  id: string;
  tipo: TransaccionTipo;
  monto: number;
  fecha: string;
  estado: TransaccionEstado;
  clienteId: string;
  vehiculoId: string;
  vencimiento?: string;
  notas?: string;
}

const PAPEL_POR_PROCESO = 4;

interface CrmState {
  loading: boolean;
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  transacciones: Transaccion[];
  procesosDigitalizados: number;
  hojasAhorradas: number;
  reload: () => Promise<void>;
  addCliente: (c: Omit<Cliente, "id" | "createdAt">) => Promise<Cliente | null>;
  updateCliente: (id: string, c: Partial<Cliente>) => Promise<void>;
  deleteCliente: (id: string) => Promise<void>;
  addVehiculo: (v: Omit<Vehiculo, "id">) => Promise<Vehiculo | null>;
  updateVehiculo: (id: string, v: Partial<Vehiculo>) => Promise<void>;
  deleteVehiculo: (id: string) => Promise<void>;
  addTransaccion: (t: Omit<Transaccion, "id">) => Promise<Transaccion | null>;
  updateTransaccion: (id: string, t: Partial<Transaccion>) => Promise<void>;
  deleteTransaccion: (id: string) => Promise<void>;
}

const Ctx = createContext<CrmState | null>(null);

const mapCliente = (r: any): Cliente => ({
  id: r.id, nombre: r.nombre, cedula: r.cedula, telefono: r.telefono ?? "",
  correo: r.correo ?? "", direccion: r.direccion ?? "", estado: r.estado,
  createdAt: (r.created_at ?? "").slice(0, 10),
});
const mapVehiculo = (r: any): Vehiculo => ({
  id: r.id, placa: r.placa, marca: r.marca, modelo: r.modelo, anio: r.anio,
  color: r.color ?? "", kilometraje: r.kilometraje ?? 0,
  precioCompra: Number(r.precio_compra) || 0, precioVenta: Number(r.precio_venta) || 0,
  estado: r.estado, notas: r.notas ?? "",
});
const mapTransaccion = (r: any): Transaccion => ({
  id: r.id, tipo: r.tipo, monto: Number(r.monto) || 0, fecha: r.fecha,
  estado: r.estado, clienteId: r.cliente_id, vehiculoId: r.vehiculo_id,
  vencimiento: r.vencimiento ?? undefined, notas: r.notas ?? undefined,
});

const toClienteRow = (c: Partial<Cliente>) => ({
  ...(c.nombre !== undefined && { nombre: c.nombre }),
  ...(c.cedula !== undefined && { cedula: c.cedula }),
  ...(c.telefono !== undefined && { telefono: c.telefono }),
  ...(c.correo !== undefined && { correo: c.correo }),
  ...(c.direccion !== undefined && { direccion: c.direccion }),
  ...(c.estado !== undefined && { estado: c.estado }),
});
const toVehiculoRow = (v: Partial<Vehiculo>) => ({
  ...(v.placa !== undefined && { placa: v.placa }),
  ...(v.marca !== undefined && { marca: v.marca }),
  ...(v.modelo !== undefined && { modelo: v.modelo }),
  ...(v.anio !== undefined && { anio: v.anio }),
  ...(v.color !== undefined && { color: v.color }),
  ...(v.kilometraje !== undefined && { kilometraje: v.kilometraje }),
  ...(v.precioCompra !== undefined && { precio_compra: v.precioCompra }),
  ...(v.precioVenta !== undefined && { precio_venta: v.precioVenta }),
  ...(v.estado !== undefined && { estado: v.estado }),
  ...(v.notas !== undefined && { notas: v.notas }),
});
const toTransaccionRow = (t: Partial<Transaccion>) => ({
  ...(t.tipo !== undefined && { tipo: t.tipo }),
  ...(t.monto !== undefined && { monto: t.monto }),
  ...(t.fecha !== undefined && { fecha: t.fecha }),
  ...(t.estado !== undefined && { estado: t.estado }),
  ...(t.clienteId !== undefined && { cliente_id: t.clienteId }),
  ...(t.vehiculoId !== undefined && { vehiculo_id: t.vehiculoId }),
  ...(t.vencimiento !== undefined && { vencimiento: t.vencimiento || null }),
  ...(t.notas !== undefined && { notas: t.notas || null }),
});

export function CrmProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [cl, ve, tx] = await Promise.all([
      supabase.from("clientes").select("*").order("created_at", { ascending: false }),
      supabase.from("vehiculos").select("*").order("created_at", { ascending: false }),
      supabase.from("transacciones").select("*").order("fecha", { ascending: false }),
    ]);
    setClientes((cl.data ?? []).map(mapCliente));
    setVehiculos((ve.data ?? []).map(mapVehiculo));
    setTransacciones((tx.data ?? []).map(mapTransaccion));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) reload();
    else { setClientes([]); setVehiculos([]); setTransacciones([]); setLoading(false); }
  }, [user, reload]);

  const value = useMemo<CrmState>(() => {
    const procesosDigitalizados = clientes.length + vehiculos.length + transacciones.length;
    return {
      loading,
      clientes, vehiculos, transacciones,
      procesosDigitalizados,
      hojasAhorradas: procesosDigitalizados * PAPEL_POR_PROCESO,
      reload,
      addCliente: async (c) => {
        const { data, error } = await supabase.from("clientes").insert({ ...toClienteRow(c), created_by: user?.id }).select().single();
        if (error || !data) throw error;
        const nuevo = mapCliente(data);
        setClientes((p) => [nuevo, ...p]);
        return nuevo;
      },
      updateCliente: async (id, c) => {
        const { data, error } = await supabase.from("clientes").update(toClienteRow(c)).eq("id", id).select().single();
        if (error || !data) throw error;
        setClientes((p) => p.map((x) => (x.id === id ? mapCliente(data) : x)));
      },
      deleteCliente: async (id) => {
        const { error } = await supabase.from("clientes").delete().eq("id", id);
        if (error) throw error;
        setClientes((p) => p.filter((x) => x.id !== id));
      },
      addVehiculo: async (v) => {
        const { data, error } = await supabase.from("vehiculos").insert({ ...toVehiculoRow(v), created_by: user?.id }).select().single();
        if (error || !data) throw error;
        const nuevo = mapVehiculo(data);
        setVehiculos((p) => [nuevo, ...p]);
        return nuevo;
      },
      updateVehiculo: async (id, v) => {
        const { data, error } = await supabase.from("vehiculos").update(toVehiculoRow(v)).eq("id", id).select().single();
        if (error || !data) throw error;
        setVehiculos((p) => p.map((x) => (x.id === id ? mapVehiculo(data) : x)));
      },
      deleteVehiculo: async (id) => {
        const { error } = await supabase.from("vehiculos").delete().eq("id", id);
        if (error) throw error;
        setVehiculos((p) => p.filter((x) => x.id !== id));
      },
      addTransaccion: async (t) => {
        const { data, error } = await supabase.from("transacciones").insert({ ...toTransaccionRow(t), created_by: user?.id } as any).select().single();
        if (error || !data) throw error;
        const nuevo = mapTransaccion(data);
        setTransacciones((p) => [nuevo, ...p]);
        return nuevo;
      },
      updateTransaccion: async (id, t) => {
        const { data, error } = await supabase.from("transacciones").update(toTransaccionRow(t)).eq("id", id).select().single();
        if (error || !data) throw error;
        setTransacciones((p) => p.map((x) => (x.id === id ? mapTransaccion(data) : x)));
      },
      deleteTransaccion: async (id) => {
        const { error } = await supabase.from("transacciones").delete().eq("id", id);
        if (error) throw error;
        setTransacciones((p) => p.filter((x) => x.id !== id));
      },
    };
  }, [clientes, vehiculos, transacciones, loading, reload, user]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCrm() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCrm debe usarse dentro de <CrmProvider>");
  return v;
}

export const formatCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
