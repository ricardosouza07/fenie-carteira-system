"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Session } from "@supabase/supabase-js";

import {
  authCookieNames,
  createOptionalSupabaseAuthClient,
  loadProfileForUser,
} from "./core";
import { getDefaultRouteForRole } from "./permissions";

export type LoginActionState = {
  error: string | null;
};

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure:
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("https://"),
  path: "/",
};

async function setSessionCookies(session: Session) {
  const cookieStore = await cookies();
  const maxAge = session.expires_in ?? 60 * 60;

  cookieStore.set(authCookieNames.accessToken, session.access_token, {
    ...cookieOptions,
    maxAge,
  });
  cookieStore.set(authCookieNames.refreshToken, session.refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function clearSessionCookies() {
  const cookieStore = await cookies();

  cookieStore.delete(authCookieNames.accessToken);
  cookieStore.delete(authCookieNames.refreshToken);
}

function readField(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value.trim() : "";
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = readField(formData, "email");
  const password = readField(formData, "password");
  const client = createOptionalSupabaseAuthClient();

  if (!client) {
    redirect("/dashboard");
  }

  if (!email || !password) {
    return {
      error: "Informe e-mail e senha para entrar.",
    };
  }

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session || !data.user) {
    return {
      error: "E-mail ou senha invalidos.",
    };
  }

  await setSessionCookies(data.session);

  const profileClient = createOptionalSupabaseAuthClient(
    data.session.access_token,
  );
  const profile = profileClient
    ? await loadProfileForUser(profileClient, data.user.id)
    : null;

  if (!profile) {
    await clearSessionCookies();

    return {
      error: "Usuario autenticado sem profile vinculado.",
    };
  }

  if (!profile.active) {
    await clearSessionCookies();

    return {
      error: "Usuario inativo. Fale com o administrador.",
    };
  }

  redirect(getDefaultRouteForRole(profile.role));
}

export async function logoutAction() {
  const refreshToken = (await cookies()).get(authCookieNames.refreshToken)?.value;
  const client = createOptionalSupabaseAuthClient();

  if (client && refreshToken) {
    await client.auth.signOut({ scope: "local" });
  }

  await clearSessionCookies();
  redirect("/login");
}
