import { getClientFinancialStatus } from "@/features/carteira/financial-status";
import type {
  CarteiraClient,
  ClientLevel,
  FinancialStatus,
} from "@/features/carteira/types";
import { getCurrentPeriod } from "@/lib/current-period";

export const ATTENTION_MIN_DAYS = 60;
export const RISK_MIN_DAYS = 90;
export const INACTIVE_MIN_DAYS = 180;
export const CONVERTED_WINDOW_DAYS = 30;

export const healthStatusLabels: Record<ClientLevel, string> = {
  saudavel: "Saudável",
  atencao: "Atenção",
  risco: "Risco",
  inativo: "Inativo antigo",
};

export type OperationalIndicatorKey =
  | "atencao"
  | "risco"
  | "inativos"
  | "recompra"
  | "convertidos"
  | "nao_trabalhados"
  | "inadimplentes"
  | "bloqueados"
  | "negociacoes_financeiras";

export const operationalIndicatorInfo: Record<
  OperationalIndicatorKey,
  {
    carteiraLabel: string;
    dashboardLabel: string;
    description: string;
  }
> = {
  atencao: {
    carteiraLabel: "Atenção",
    dashboardLabel: "Clientes em atenção",
    description: "60 a 89 dias sem comprar.",
  },
  risco: {
    carteiraLabel: "Risco",
    dashboardLabel: "Clientes em risco",
    description: "90 a 179 dias sem comprar.",
  },
  inativos: {
    carteiraLabel: "Inativos",
    dashboardLabel: "Inativos antigos",
    description: "180+ dias sem comprar.",
  },
  recompra: {
    carteiraLabel: "Recompra",
    dashboardLabel: "Recompras pendentes",
    description: "Próxima compra prevista já passou.",
  },
  convertidos: {
    carteiraLabel: "Convertidos",
    dashboardLabel: "Convertidos no mês",
    description: "Conversão registrada nos últimos 30 dias.",
  },
  nao_trabalhados: {
    carteiraLabel: "Não trabalhados",
    dashboardLabel: "Não trabalhados",
    description: "Cliente sem interação comercial registrada.",
  },
  inadimplentes: {
    carteiraLabel: "Inadimplentes",
    dashboardLabel: "Inadimplentes",
    description: "Cliente com pendência financeira marcada pelo escritório.",
  },
  bloqueados: {
    carteiraLabel: "Bloqueados",
    dashboardLabel: "Bloqueados",
    description: "Cliente com venda bloqueada até liberação financeira.",
  },
  negociacoes_financeiras: {
    carteiraLabel: "Em negociação",
    dashboardLabel: "Negociações financeiras",
    description: "Regularização financeira em andamento.",
  },
};

export type OperationalCounts = {
  totalClientes: number;
  saudaveis: number;
  atencao: number;
  risco: number;
  inativosAntigos: number;
  recomprasPendentes: number;
  convertidos: number;
  naoTrabalhados: number;
  clientesInadimplentes: number;
  clientesBloqueados: number;
  negociacoesFinanceiras: number;
  riscoSemContato: number;
  inativosSemAcao: number;
};

function dateToTime(date: string | null | undefined) {
  if (!date) {
    return null;
  }

  const parsed = new Date(`${date.slice(0, 10)}T00:00:00.000Z`);

  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export function daysBetweenDateKeys(
  startDate: string | null | undefined,
  endDate = getCurrentPeriod().date,
) {
  const start = dateToTime(startDate);
  const end = dateToTime(endDate);

  if (start === null || end === null) {
    return null;
  }

  return Math.round((end - start) / 86_400_000);
}

export function calculateClientHealthStatus(daysWithoutBuying: number): ClientLevel {
  if (daysWithoutBuying >= INACTIVE_MIN_DAYS) {
    return "inativo";
  }

  if (daysWithoutBuying >= RISK_MIN_DAYS) {
    return "risco";
  }

  if (daysWithoutBuying >= ATTENTION_MIN_DAYS) {
    return "atencao";
  }

  return "saudavel";
}

export function getClientHealthLabel(level: ClientLevel) {
  return healthStatusLabels[level];
}

export function isDateBeforeToday(
  date: string | null | undefined,
  today = getCurrentPeriod().date,
) {
  return Boolean(date && date.slice(0, 10) < today);
}

export function isDateWithinLastDays(
  date: string | null | undefined,
  days: number,
  today = getCurrentPeriod().date,
) {
  const diff = daysBetweenDateKeys(date, today);

  return diff !== null && diff >= 0 && diff <= days;
}

export function getLastConversionDate(client: CarteiraClient) {
  const dates = [
    ...(client.interacoes ?? [])
      .filter((interaction) => interaction.status === "convertido")
      .map((interaction) => interaction.criadoEm.slice(0, 10)),
    client.status === "convertido" ? client.ultimaAcao.data : null,
  ].filter((date): date is string => Boolean(date));

  return dates.sort().at(-1) ?? null;
}

export function isClientConverted(
  client: CarteiraClient,
  today = getCurrentPeriod().date,
) {
  return isDateWithinLastDays(
    getLastConversionDate(client),
    CONVERTED_WINDOW_DAYS,
    today,
  );
}

export function getOperationalClientLevel(
  client: CarteiraClient,
  today = getCurrentPeriod().date,
) {
  if (isClientConverted(client, today)) {
    return null;
  }

  return calculateClientHealthStatus(client.diasSemComprar);
}

export function matchesOperationalLevel(
  client: CarteiraClient,
  level: ClientLevel,
  today = getCurrentPeriod().date,
) {
  return getOperationalClientLevel(client, today) === level;
}

export function isClientInRecompra(
  client: CarteiraClient,
  today = getCurrentPeriod().date,
) {
  return !isClientConverted(client, today) && isDateBeforeToday(client.proximaCompra, today);
}

export function isClientOldInactive(
  client: CarteiraClient,
  today = getCurrentPeriod().date,
) {
  return matchesOperationalLevel(client, "inativo", today);
}

export function hasCommercialInteraction(client: CarteiraClient) {
  return (
    client.status !== "nao_trabalhado" ||
    Boolean(client.ultimaAcao.data) ||
    Boolean(client.interacoes?.length)
  );
}

export function isClientNotWorked(client: CarteiraClient) {
  return !hasCommercialInteraction(client);
}

export function isRiskWithoutContact(
  client: CarteiraClient,
  today = getCurrentPeriod().date,
) {
  return matchesOperationalLevel(client, "risco", today) && isClientNotWorked(client);
}

export function isInactiveWithoutAction(
  client: CarteiraClient,
  today = getCurrentPeriod().date,
) {
  return isClientOldInactive(client, today) && isClientNotWorked(client);
}

function hasFinancialStatus(client: CarteiraClient, status: FinancialStatus) {
  return getClientFinancialStatus(client) === status;
}

export function buildOperationalCounts(
  clients: CarteiraClient[],
  today = getCurrentPeriod().date,
): OperationalCounts {
  return {
    totalClientes: clients.length,
    saudaveis: clients.filter((client) =>
      matchesOperationalLevel(client, "saudavel", today),
    ).length,
    atencao: clients.filter((client) =>
      matchesOperationalLevel(client, "atencao", today),
    ).length,
    risco: clients.filter((client) =>
      matchesOperationalLevel(client, "risco", today),
    ).length,
    inativosAntigos: clients.filter((client) =>
      isClientOldInactive(client, today),
    ).length,
    recomprasPendentes: clients.filter((client) =>
      isClientInRecompra(client, today),
    ).length,
    convertidos: clients.filter((client) => isClientConverted(client, today))
      .length,
    naoTrabalhados: clients.filter(isClientNotWorked).length,
    clientesInadimplentes: clients.filter((client) =>
      hasFinancialStatus(client, "inadimplente"),
    ).length,
    clientesBloqueados: clients.filter((client) =>
      hasFinancialStatus(client, "bloqueado"),
    ).length,
    negociacoesFinanceiras: clients.filter((client) =>
      hasFinancialStatus(client, "negociacao"),
    ).length,
    riscoSemContato: clients.filter((client) => isRiskWithoutContact(client, today))
      .length,
    inativosSemAcao: clients.filter((client) =>
      isInactiveWithoutAction(client, today),
    ).length,
  };
}
