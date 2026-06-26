import type { CarteiraClient, ClientLevel } from "@/features/carteira/types";
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
