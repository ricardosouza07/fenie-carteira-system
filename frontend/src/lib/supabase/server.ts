import { createClient } from "@supabase/supabase-js";

import {
  getOptionalSupabaseServerEnv,
  getSupabaseServerEnv,
} from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

export function createSupabaseServerClient() {
  const env = getSupabaseServerEnv();

  return createClient<Database>(env.url, env.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createSupabaseServiceClient() {
  const env = getSupabaseServerEnv();

  if (!env.serviceRoleKey) {
    throw new Error(
      "Variavel de ambiente ausente: SUPABASE_SERVICE_ROLE_KEY. Use somente em rotas e servicos server-side.",
    );
  }

  return createClient<Database>(env.url, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createOptionalSupabaseServiceClient() {
  const env = getOptionalSupabaseServerEnv();

  if (!env) {
    return null;
  }

  return createClient<Database>(env.url, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
