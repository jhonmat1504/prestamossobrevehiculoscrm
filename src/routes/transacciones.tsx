import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/transacciones")({
  head: () => ({ meta: [{ title: "Transacciones — Freddy CRM" }] }),
  component: () => (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Operaciones Financieras" description="Compras, ventas y préstamos sobre vehículos." />
      <Card><CardContent className="flex items-center gap-3 p-8 text-muted-foreground">
        <Construction className="h-5 w-5" /> Módulo en construcción — próximo paso de esta versión.
      </CardContent></Card>
    </div>
  ),
});
