import { Save } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";

export default function RegrasPage() {
  return (
    <>
      <PageHeader
        title="Regras"
        description="Configurações visuais para classificação, status e operação comercial."
        actions={
          <Button size="sm">
            <Save className="h-4 w-4" />
            Salvar alterações
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Classificação automática</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border p-3">
            <StatusBadge status="saudavel" />
            <p className="mt-2 text-sm text-muted-foreground">0 a 30 dias sem comprar</p>
          </div>
          <div className="rounded-md border p-3">
            <StatusBadge status="atencao" />
            <p className="mt-2 text-sm text-muted-foreground">31 a 60 dias sem comprar</p>
          </div>
          <div className="rounded-md border p-3">
            <StatusBadge status="risco" />
            <p className="mt-2 text-sm text-muted-foreground">61 a 89 dias sem comprar</p>
          </div>
          <div className="rounded-md border p-3">
            <StatusBadge status="inativo" />
            <p className="mt-2 text-sm text-muted-foreground">90 dias ou mais</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
