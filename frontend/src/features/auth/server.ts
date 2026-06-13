import { cookies } from "next/headers";

import { authCookieNames, createOptionalSupabaseAuthClient, loadProfileForUser } from "./core";
import { devProfile } from "./permissions";
import type { AuthContext } from "./types";

export async function getCurrentAuthContext(): Promise<AuthContext> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookieNames.accessToken)?.value;
  const client = createOptionalSupabaseAuthClient(accessToken);

  if (!client) {
    return {
      mode: "dev",
      profile: devProfile,
      warning:
        "Supabase Auth nao esta configurado. Sistema liberado em modo dev/mock.",
    };
  }

  if (!accessToken) {
    return {
      mode: "supabase",
      profile: null,
    };
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error || !user) {
    return {
      mode: "supabase",
      profile: null,
    };
  }

  const profile = await loadProfileForUser(client, user.id);

  if (!profile || !profile.active) {
    return {
      mode: "supabase",
      profile: null,
      warning: !profile
        ? "Usuario autenticado sem profile vinculado."
        : "Usuario inativo.",
    };
  }

  return {
    mode: "supabase",
    profile,
  };
}
