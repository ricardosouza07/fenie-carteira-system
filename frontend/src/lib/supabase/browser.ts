"use client";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseBrowserEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

export function createSupabaseBrowserClient() {
  const env = getSupabaseBrowserEnv();

  return createClient<Database>(env.url, env.anonKey);
}
