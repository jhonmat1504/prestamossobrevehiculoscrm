import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { CrmProvider } from "@/lib/crm-store";
import { AuthProvider } from "@/lib/auth";
import { AuthGate } from "@/components/auth-gate";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">La ruta que buscas no existe o fue movida.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Ir al Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">Intenta recargar la página.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Freddy CRM — Compra y Venta de Vehículos" },
      { name: "description", content: "CRM para la gestión de clientes, inventario vehicular y operaciones financieras de Compra y Venta de Vehículos Freddy." },
      { property: "og:title", content: "Freddy CRM — Compra y Venta de Vehículos" },
      { name: "twitter:title", content: "Freddy CRM — Compra y Venta de Vehículos" },
      { property: "og:description", content: "CRM para la gestión de clientes, inventario vehicular y operaciones financieras de Compra y Venta de Vehículos Freddy." },
      { name: "twitter:description", content: "CRM para la gestión de clientes, inventario vehicular y operaciones financieras de Compra y Venta de Vehículos Freddy." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5c4ce378-e699-4504-be70-ce1fa6646f7d/id-preview-d4f07fe9--14b8b841-261b-4ae9-bfc2-a06944abd37f.lovable.app-1780004269183.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5c4ce378-e699-4504-be70-ce1fa6646f7d/id-preview-d4f07fe9--14b8b841-261b-4ae9-bfc2-a06944abd37f.lovable.app-1780004269183.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <CrmProvider>
            <SidebarProvider>
              <div className="flex min-h-screen w-full bg-background">
                <AppSidebar />
                <div className="flex flex-1 flex-col min-w-0">
                  <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
                    <SidebarTrigger />
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm font-semibold">Compra y Venta de Vehículos Freddy</span>
                      <span className="text-[11px] text-muted-foreground">Sistema CRM · v1.0</span>
                    </div>
                  </header>
                  <main className="flex-1 p-4 md:p-6">
                    <Outlet />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </CrmProvider>
        </AuthGate>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
