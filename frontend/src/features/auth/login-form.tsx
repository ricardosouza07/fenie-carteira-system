"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = {
  error: null,
};

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <Button className="w-full" type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Entrando
        </>
      ) : (
        <>
          Entrar
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md border bg-background text-sm font-bold text-primary">
          F
        </div>
        <CardTitle className="text-xl">Central de Carteira</CardTitle>
        <CardDescription>
          Acesso interno da equipe comercial Fenie PRO.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seuemail@fenie.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="********"
              autoComplete="current-password"
              required
            />
          </div>

          {state.error ? (
            <div className="rounded-md border border-danger-soft bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
              {state.error}
            </div>
          ) : null}

          <SubmitButton pending={pending} />
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Use o usuario criado no Supabase Auth pelo administrador.
        </p>
      </CardContent>
    </Card>
  );
}
