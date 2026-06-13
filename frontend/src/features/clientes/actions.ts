"use server";

import { loadClienteDetailFromSupabase } from "./supabase-service";
import type { LoadClienteDetailResult } from "./types";

export async function loadClienteDetailFromSupabaseAction(
  customerId: string,
): Promise<LoadClienteDetailResult> {
  return loadClienteDetailFromSupabase(customerId);
}
