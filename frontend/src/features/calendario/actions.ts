"use server";

import {
  completeAgendaFollowUp,
  rescheduleAgendaFollowUp,
} from "@/features/agenda/supabase-service";
import type {
  AgendaMutationResult,
  CompleteFollowUpInput,
  RescheduleFollowUpInput,
} from "@/features/agenda/types";

export async function rescheduleCalendarFollowUpAction(
  input: RescheduleFollowUpInput,
): Promise<AgendaMutationResult> {
  return rescheduleAgendaFollowUp(input);
}

export async function completeCalendarFollowUpAction(
  input: CompleteFollowUpInput,
): Promise<AgendaMutationResult> {
  return completeAgendaFollowUp(input);
}
