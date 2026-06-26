import type { CarteiraClient, FinancialStatus } from "./types";

export const DEFAULT_FINANCIAL_STATUS: FinancialStatus = "adimplente";

export const financialStatusLabels: Record<FinancialStatus, string> = {
  adimplente: "Adimplente",
  inadimplente: "Inadimplente",
  bloqueado: "Bloqueado",
  negociacao: "Em negociação",
};

export const financialStatusFilterOptions: {
  value: "todas" | FinancialStatus;
  label: string;
}[] = [
  { value: "todas", label: "Todas as situações financeiras" },
  { value: "adimplente", label: "Adimplentes" },
  { value: "inadimplente", label: "Inadimplentes" },
  { value: "bloqueado", label: "Bloqueados" },
  { value: "negociacao", label: "Em negociação" },
];

export const financialStatusValues: FinancialStatus[] = [
  "adimplente",
  "inadimplente",
  "bloqueado",
  "negociacao",
];

export const financialStatusEditOptions = financialStatusValues.map((value) => ({
  value,
  label: financialStatusLabels[value],
}));

export function normalizeFinancialStatus(value: unknown): FinancialStatus {
  return typeof value === "string" &&
    financialStatusValues.includes(value as FinancialStatus)
    ? (value as FinancialStatus)
    : DEFAULT_FINANCIAL_STATUS;
}

export function getClientFinancialStatus(
  client: Pick<CarteiraClient, "situacaoFinanceira">,
) {
  return normalizeFinancialStatus(client.situacaoFinanceira);
}

export function hasFinancialRestriction(
  clientOrStatus: Pick<CarteiraClient, "situacaoFinanceira"> | FinancialStatus,
) {
  const status =
    typeof clientOrStatus === "string"
      ? clientOrStatus
      : getClientFinancialStatus(clientOrStatus);

  return status === "inadimplente" || status === "bloqueado";
}

export const FINANCIAL_RESTRICTION_MESSAGE =
  "Cliente com pendências financeiras. Consultar financeiro antes de negociar nova venda.";
