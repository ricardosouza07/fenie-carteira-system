import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authCookieNames, createOptionalSupabaseAuthClient } from "./core";
import {
  devProfile,
  getDefaultRouteForRole,
  isRouteAllowedForRole,
} from "./permissions";
import { getCurrentAuthContext } from "./server";
import type { AuthProfile, UserRole } from "./types";

export async function getCurrentProfile() {
  const auth = await getCurrentAuthContext();

  return auth.profile;
}

export async function getAuthenticatedSupabaseClient() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookieNames.accessToken)?.value;
  const client = createOptionalSupabaseAuthClient(accessToken);

  if (!client) {
    return {
      status: "dev" as const,
      client: null,
      profile: devProfile,
      message:
        "Supabase Auth nao esta configurado. Usando fallback local/mock.",
    };
  }

  if (!accessToken) {
    return {
      status: "unauthenticated" as const,
      client: null,
      profile: null,
      message: "Usuario nao autenticado.",
    };
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    return {
      status: "unauthenticated" as const,
      client: null,
      profile: null,
      message: "Profile nao encontrado ou usuario inativo.",
    };
  }

  return {
    status: "authenticated" as const,
    client,
    profile,
    message: null,
  };
}

export async function requireRole(roles: UserRole[]) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!roles.includes(profile.role)) {
    redirect(getDefaultRouteForRole(profile.role));
  }

  return profile;
}

export function canAccessRoute(pathname: string, profile: AuthProfile | null) {
  return profile ? isRouteAllowedForRole(pathname, profile.role) : false;
}

export async function canAccessCustomer(customerId: string) {
  const access = await getAuthenticatedSupabaseClient();

  if (access.status === "dev") {
    return true;
  }

  if (!access.client) {
    return false;
  }

  const { data, error } = await access.client
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .maybeSingle();

  return !error && Boolean(data);
}

export function getVisibleCustomerScope(profile: AuthProfile | null) {
  if (!profile) {
    return {
      type: "none" as const,
      salespersonId: null,
      description: "Sem profile autenticado.",
    };
  }

  if (
    profile.role === "admin" ||
    profile.role === "supervisor" ||
    profile.role === "operador_interno"
  ) {
    return {
      type: "all" as const,
      salespersonId: profile.salespersonId,
      description: "Acesso operacional completo.",
    };
  }

  return {
    type: "none" as const,
    salespersonId: profile.salespersonId,
    description: "Perfil legado sem acesso operacional no MVP.",
  };
}
