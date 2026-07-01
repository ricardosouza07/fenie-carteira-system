import type { CarteiraClient, PortfolioStatus } from "./types";

export const DEFAULT_PORTFOLIO_STATUS: PortfolioStatus = "ativo";

export const portfolioStatusLabels: Record<PortfolioStatus, string> = {
  ativo: "Ativo",
  fechou_salao: "Fechou salão",
  mudou_de_ramo: "Mudou de ramo",
  sem_potencial: "Sem potencial",
  duplicado: "Duplicado",
  arquivado: "Arquivado",
};

export const portfolioStatusValues: PortfolioStatus[] = [
  "ativo",
  "fechou_salao",
  "mudou_de_ramo",
  "sem_potencial",
  "duplicado",
  "arquivado",
];

export type PortfolioStatusFilter = "todos" | PortfolioStatus;

export const portfolioStatusFilterOptions: {
  value: PortfolioStatusFilter;
  label: string;
}[] = [
  { value: "ativo", label: "Ativos" },
  { value: "fechou_salao", label: "Fechou salão" },
  { value: "mudou_de_ramo", label: "Mudou de ramo" },
  { value: "sem_potencial", label: "Sem potencial" },
  { value: "duplicado", label: "Duplicados" },
  { value: "arquivado", label: "Arquivados" },
  { value: "todos", label: "Todos" },
];

export const portfolioStatusEditOptions = portfolioStatusValues.map((value) => ({
  value,
  label: portfolioStatusLabels[value],
}));

export function normalizePortfolioStatus(value: unknown): PortfolioStatus {
  return typeof value === "string" &&
    portfolioStatusValues.includes(value as PortfolioStatus)
    ? (value as PortfolioStatus)
    : DEFAULT_PORTFOLIO_STATUS;
}

export function getClientPortfolioStatus(
  client: Pick<CarteiraClient, "situacaoCarteira">,
) {
  return normalizePortfolioStatus(client.situacaoCarteira);
}

export function isClientInActivePortfolio(
  client: Pick<CarteiraClient, "situacaoCarteira">,
) {
  return getClientPortfolioStatus(client) === DEFAULT_PORTFOLIO_STATUS;
}

export function isClientOutOfOperation(
  client: Pick<CarteiraClient, "situacaoCarteira">,
) {
  return !isClientInActivePortfolio(client);
}

export function getPortfolioStatusAlertMessage(
  clientOrStatus: Pick<CarteiraClient, "situacaoCarteira"> | PortfolioStatus,
) {
  const status =
    typeof clientOrStatus === "string"
      ? normalizePortfolioStatus(clientOrStatus)
      : getClientPortfolioStatus(clientOrStatus);

  if (status === "ativo") {
    return null;
  }

  return `Cliente fora da operação comercial. Motivo: ${portfolioStatusLabels[status]}.`;
}
