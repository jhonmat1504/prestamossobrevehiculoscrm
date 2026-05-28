import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/reportes")({
  head: () => ({ meta: [{ title: "Reportes — Freddy CRM" }] }),
  component: () => (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Reportes" description="Gráficos de movimientos, márgenes y costos." />
      <Card><CardContent className="flex items-center gap-3 p-8 text-muted-foreground">
        <Construction className="h-5 w-5" /> Módulo en construcción — próximo paso de esta versión.
      </CardContent></Card>
    </div>
  ),
});
