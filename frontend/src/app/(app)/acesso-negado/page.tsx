import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDefaultRouteForRole } from "@/features/auth/permissions";
import { getCurrentAuthContext } from "@/features/auth/server";

export default async function AcessoNegadoPage() {
  const auth = await getCurrentAuthContext();
  const fallbackHref = auth.profile
    ? getDefaultRouteForRole(auth.profile.role)
    : "/login";

  return (
    <>
      <PageHeader
        eyebrow="Seguranca"
        title="Acesso nao permitido"
        description="Seu perfil nao possui permissao para abrir esta area do sistema."
      />

      <Card className="max-w-2xl">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-warning text-warning-foreground">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-foreground">
              Permissao insuficiente
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Se precisar acessar esta funcionalidade, solicite a liberacao ao
              administrador ou supervisor responsavel.
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link href={fallbackHref}>Voltar para minha area</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
