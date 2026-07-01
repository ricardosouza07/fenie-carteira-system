"use server";

import {
  loadClienteDetailFromSupabase,
  updateClienteFinancialStatus,
  updateClientePortfolioStatus,
} from "./supabase-service";
import type {
  FinancialStatus,
  PortfolioStatus,
} from "@/features/carteira/types";
import type { LoadClienteDetailResult } from "./types";

export async function loadClienteDetailFromSupabaseAction(
  customerId: string,
): Promise<LoadClienteDetailResult> {
  return loadClienteDetailFromSupabase(customerId);
}

export async function updateClienteFinancialStatusAction(input: {
  customerId: string;
  situacaoFinanceira: FinancialStatus;
  observacaoFinanceira: string | null;
}) {
  return updateClienteFinancialStatus(input);
}

export async function updateClientePortfolioStatusAction(input: {
  customerId: string;
  situacaoCarteira: PortfolioStatus;
  observacaoCarteira: string | null;
}) {
  return updateClientePortfolioStatus(input);
}
