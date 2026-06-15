const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

const monthLabels = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export type CurrentPeriod = {
  date: string;
  month: string;
  year: string;
  monthKey: string;
  label: string;
};

export function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return date.toISOString().slice(0, 10);
}

export function getCurrentPeriod(
  referenceDate = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
): CurrentPeriod {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referenceDate);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const year = values.year;
  const month = values.month;
  const day = values.day;
  const monthIndex = Number(month) - 1;

  return {
    date: `${year}-${month}-${day}`,
    month,
    year,
    monthKey: `${year}-${month}`,
    label: `${monthLabels[monthIndex] ?? month} ${year}`,
  };
}
