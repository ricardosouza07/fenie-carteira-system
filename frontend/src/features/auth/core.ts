import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getOptionalSupabaseBrowserEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

import type { AuthProfile } from "./types";

export const authCookieNames = {
  accessToken: "fenie-sb-access-token",
  refreshToken: "fenie-sb-refresh-token",
};

export type AuthClient = SupabaseClient<Database>;

type ProfileRow = {
  id: string;
  salesperson_id: string | null;
  full_name: string;
  email: string;
  role: Database["public"]["Enums"]["user_role"];
  active: boolean;
};

export function createOptionalSupabaseAuthClient(accessToken?: string | null) {
  const env = getOptionalSupabaseBrowserEnv();

  if (!env) {
    return null;
  }

  return createClient<Database>(env.url, env.anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

function normalizeProfile(row: ProfileRow): AuthProfile {
  return {
    id: row.id,
    salespersonId: row.salesperson_id,
    name: row.full_name,
    email: row.email,
    role: row.role,
    active: row.active,
  };
}

export async function loadProfileForUser(
  client: AuthClient,
  userId: string,
): Promise<AuthProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("id,salesperson_id,full_name,email,role,active")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeProfile(data as ProfileRow);
}
