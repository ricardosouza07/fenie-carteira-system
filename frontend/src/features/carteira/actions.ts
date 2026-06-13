"use server";

import { loadCarteiraFromSupabase } from "./supabase-service";
import { saveInteractionToSupabase } from "./interaction-supabase-service";
import type {
  LoadCarteiraSupabaseResult,
  SaveInteractionSupabaseInput,
  SaveInteractionSupabaseResult,
} from "./server-types";

export async function loadCarteiraFromSupabaseAction(): Promise<LoadCarteiraSupabaseResult> {
  return loadCarteiraFromSupabase();
}

export async function saveInteractionToSupabaseAction(
  input: SaveInteractionSupabaseInput,
): Promise<SaveInteractionSupabaseResult> {
  return saveInteractionToSupabase(input);
}
