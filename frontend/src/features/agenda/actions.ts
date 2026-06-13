"use server";

import {
  completeAgendaFollowUp,
  loadAgendaFromSupabase,
  rescheduleAgendaFollowUp,
} from "./supabase-service";
import type {
  AgendaMutationResult,
  CompleteFollowUpInput,
  LoadAgendaResult,
  RescheduleFollowUpInput,
} from "./types";

export async function loadAgendaFromSupabaseAction(): Promise<LoadAgendaResult> {
  return loadAgendaFromSupabase();
}

export async function rescheduleAgendaFollowUpAction(
  input: RescheduleFollowUpInput,
): Promise<AgendaMutationResult> {
  return rescheduleAgendaFollowUp(input);
}

export async function completeAgendaFollowUpAction(
  input: CompleteFollowUpInput,
): Promise<AgendaMutationResult> {
  return completeAgendaFollowUp(input);
}
