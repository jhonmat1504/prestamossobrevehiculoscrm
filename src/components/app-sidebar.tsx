import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Car, Receipt, BarChart3, Leaf, LogOut, ShieldCheck } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Vehículos", url: "/vehiculos", icon: Car },
  { title: "Transacciones", url: "/transacciones", icon: Receipt },
  { title: "Reportes", url: "/reportes", icon: BarChart3 },
] as const;

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { nombre, role, signOut } = useAuth();
  const isActive = (path: string) => (path === "/" ? currentPath === "/" : currentPath.startsWith(path));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold">F</div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">Freddy CRM</span>
            <span className="text-[11px] text-sidebar-foreground/60">Compra · Venta · Préstamos</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border space-y-2">
        <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 text-sidebar-foreground">
            <ShieldCheck className="h-4 w-4 text-sidebar-primary" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{nombre ?? "Usuario"}</p>
              <p className="truncate text-[10px] uppercase tracking-wide text-sidebar-foreground/60">{role ?? "—"}</p>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut()} className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Cerrar sesión</span>
        </Button>
        <div className="flex items-center gap-2 px-2 py-2 text-sidebar-foreground/80 group-data-[collapsible=icon]:justify-center">
          <Leaf className="h-4 w-4 text-sidebar-primary" />
          <span className="text-xs group-data-[collapsible=icon]:hidden">ODS 12 · Cero papel</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
