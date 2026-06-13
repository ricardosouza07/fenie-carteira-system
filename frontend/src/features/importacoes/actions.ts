"use server";

import {
  listSupabaseImportRecords,
  publishSupabaseImport,
} from "./supabase-service";
import type {
  ListSupabaseImportsResult,
  PublishSupabaseImportInput,
  PublishSupabaseImportResult,
} from "./server-types";

export async function listSupabaseImportRecordsAction(): Promise<ListSupabaseImportsResult> {
  return listSupabaseImportRecords();
}

export async function publishSupabaseImportAction(
  input: PublishSupabaseImportInput,
): Promise<PublishSupabaseImportResult> {
  return publishSupabaseImport(input);
}
