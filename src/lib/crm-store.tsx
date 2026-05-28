import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

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

// ~ hojas de papel ahorradas por proceso digitalizado
const PAPEL_POR_PROCESO = 4;

const seedClientes: Cliente[] = [
  { id: "c1", nombre: "Carlos Mendoza", cedula: "1098765432", telefono: "+57 300 555 1122", correo: "carlos@example.com", direccion: "Cra 12 #34-56, Bogotá", estado: "Activo", createdAt: "2025-04-12" },
  { id: "c2", nombre: "María Restrepo", cedula: "1023456789", telefono: "+57 311 222 3344", correo: "maria@example.com", direccion: "Cl 80 #15-22, Medellín", estado: "Activo", createdAt: "2025-04-20" },
  { id: "c3", nombre: "Jorge Pineda", cedula: "1145678901", telefono: "+57 320 998 7766", correo: "jorge@example.com", direccion: "Av 3N #25-10, Cali", estado: "Moroso", createdAt: "2025-03-02" },
  { id: "c4", nombre: "Luisa Gómez", cedula: "1054321098", telefono: "+57 315 444 5566", correo: "luisa@example.com", direccion: "Cl 50 #20-30, Barranquilla", estado: "Activo", createdAt: "2025-05-09" },
];

const seedVehiculos: Vehiculo[] = [
  { id: "v1", placa: "ABC123", marca: "Mazda", modelo: "3", anio: 2019, color: "Gris", kilometraje: 65000, precioCompra: 42000000, precioVenta: 52000000, estado: "Disponible", notas: "Único dueño, papeles al día." },
  { id: "v2", placa: "DEF456", marca: "Chevrolet", modelo: "Onix", anio: 2021, color: "Blanco", kilometraje: 28000, precioCompra: 38000000, precioVenta: 47000000, estado: "Disponible", notas: "Mantenimiento reciente." },
  { id: "v3", placa: "GHI789", marca: "Renault", modelo: "Logan", anio: 2018, color: "Rojo", kilometraje: 92000, precioCompra: 22000000, precioVenta: 0, estado: "Empeñado", notas: "Garantía préstamo cliente c3." },
  { id: "v4", placa: "JKL012", marca: "Toyota", modelo: "Hilux", anio: 2020, color: "Negro", kilometraje: 54000, precioCompra: 95000000, precioVenta: 115000000, estado: "Vendido", notas: "Vendida a c2." },
  { id: "v5", placa: "MNO345", marca: "Kia", modelo: "Picanto", anio: 2022, color: "Azul", kilometraje: 15000, precioCompra: 35000000, precioVenta: 43000000, estado: "Disponible", notas: "" },
];

const today = new Date();
const inDays = (n: number) => new Date(today.getTime() + n * 86400000).toISOString().slice(0, 10);

const seedTransacciones: Transaccion[] = [
  { id: "t1", tipo: "Compra", monto: 42000000, fecha: "2025-05-02", estado: "Completada", clienteId: "c1", vehiculoId: "v1" },
  { id: "t2", tipo: "Venta", monto: 115000000, fecha: "2025-05-18", estado: "Completada", clienteId: "c2", vehiculoId: "v4" },
  { id: "t3", tipo: "Préstamo", monto: 15000000, fecha: "2025-04-25", estado: "Vigente", clienteId: "c3", vehiculoId: "v3", vencimiento: inDays(5) },
  { id: "t4", tipo: "Préstamo", monto: 8000000, fecha: "2025-05-10", estado: "Vigente", clienteId: "c4", vehiculoId: "v5", vencimiento: inDays(20) },
  { id: "t5", tipo: "Venta", monto: 47000000, fecha: "2025-05-25", estado: "Pendiente", clienteId: "c1", vehiculoId: "v2" },
];

interface CrmState {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  transacciones: Transaccion[];
  procesosDigitalizados: number;
  hojasAhorradas: number;
  addCliente: (c: Omit<Cliente, "id" | "createdAt">) => Cliente;
  updateCliente: (id: string, c: Partial<Cliente>) => void;
  deleteCliente: (id: string) => void;
  addVehiculo: (v: Omit<Vehiculo, "id">) => Vehiculo;
  updateVehiculo: (id: string, v: Partial<Vehiculo>) => void;
  deleteVehiculo: (id: string) => void;
  addTransaccion: (t: Omit<Transaccion, "id">) => Transaccion;
  updateTransaccion: (id: string, t: Partial<Transaccion>) => void;
}

const Ctx = createContext<CrmState | null>(null);

const uid = () => Math.random().toString(36).slice(2, 10);

export function CrmProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>(seedClientes);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>(seedVehiculos);
  const [transacciones, setTransacciones] = useState<Transaccion[]>(seedTransacciones);

  const value = useMemo<CrmState>(() => {
    const procesosDigitalizados =
      clientes.length + vehiculos.length + transacciones.length;
    return {
      clientes,
      vehiculos,
      transacciones,
      procesosDigitalizados,
      hojasAhorradas: procesosDigitalizados * PAPEL_POR_PROCESO,
      addCliente: (c) => {
        const nuevo: Cliente = { ...c, id: uid(), createdAt: new Date().toISOString().slice(0, 10) };
        setClientes((p) => [nuevo, ...p]);
        return nuevo;
      },
      updateCliente: (id, c) => setClientes((p) => p.map((x) => (x.id === id ? { ...x, ...c } : x))),
      deleteCliente: (id) => setClientes((p) => p.filter((x) => x.id !== id)),
      addVehiculo: (v) => {
        const nuevo: Vehiculo = { ...v, id: uid() };
        setVehiculos((p) => [nuevo, ...p]);
        return nuevo;
      },
      updateVehiculo: (id, v) => setVehiculos((p) => p.map((x) => (x.id === id ? { ...x, ...v } : x))),
      deleteVehiculo: (id) => setVehiculos((p) => p.filter((x) => x.id !== id)),
      addTransaccion: (t) => {
        const nuevo: Transaccion = { ...t, id: uid() };
        setTransacciones((p) => [nuevo, ...p]);
        return nuevo;
      },
      updateTransaccion: (id, t) =>
        setTransacciones((p) => p.map((x) => (x.id === id ? { ...x, ...t } : x))),
    };
  }, [clientes, vehiculos, transacciones]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCrm() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCrm debe usarse dentro de <CrmProvider>");
  return v;
}

export const formatCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
