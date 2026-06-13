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
