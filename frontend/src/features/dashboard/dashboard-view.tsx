"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  Clock3,
  DollarSign,
  ListChecks,
  PhoneCall,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useCarteiraClientsSource } from "@/features/carteira/client-store";
import {
  buildOperationalCounts,
  getOperationalClientLevel,
  isClientConverted,
  isClientInRecompra,
  isClientOldInactive,
  matchesOperationalLevel,
  operationalIndicatorInfo,
} from "@/features/carteira/operational-rules";
import { useGamification } from "@/features/gamification/gamification-provider";
import { MonthlyAchievementsPanel } from "@/features/gamification/monthly-achievements-panel";
import type {
  CarteiraClient,
  ClientLevel,
  WorkStatus,
} from "@/features/carteira/types";
import type {
  DashboardMetrics,
  DashboardPriority,
  DashboardSellerPerformance,
  LoadDashboardResult,
} from "./types";
import { getCurrentPeriod } from "@/lib/current-period";

const currentPeriod = getCurrentPeriod();
const TODAY = currentPeriod.date;
const DEFAULT_MONTH = currentPeriod.month;
const DEFAULT_YEAR = currentPeriod.year;
const DEFAULT_MONTH_KEY = currentPeriod.monthKey;

type SelectOption = {
  value: string;
  label: string;
};

type KpiTone = "default" | "danger" | "warning" | "success" | "info" | "muted";

type DashboardKpi = {
  label: string;
  value: string;
  hint: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: KpiTone;
};

type AlertItem = {
  label: string;
  count: number;
  total: number;
  description: string;
  href: string;
  tone: KpiTone;
};

type EvolutionRow = {
  label: string;
  contacts: number;
  conversions: number;
  recovered: number;
};

type HealthRow = {
  status: ClientLevel;
  count: number;
  percent: number;
  barClassName: string;
};

type SellerPerformance = DashboardSellerPerformance;
type PriorityRow = DashboardPriority;

const monthOptions: SelectOption[] = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const yearOptions: SelectOption[] = [0, 1].map((offset) => {
  const year = String(Number(DEFAULT_YEAR) - offset);

  return { value: year, label: year };
});

const healthOrder: {
  status: ClientLevel;
  barClassName: string;
}[] = [
  { status: "saudavel", barClassName: "bg-success-foreground" },
  { status: "atencao", barClassName: "bg-warning-foreground" },
  { status: "risco", barClassName: "bg-danger-soft-foreground" },
  { status: "inativo", barClassName: "bg-muted-foreground" },
];

const toneClasses: Record<
  KpiTone,
  {
    icon: string;
    value: string;
    marker: string;
    soft: string;
  }
> = {
  default: {
    icon: "bg-accent text-primary",
    value: "text-foreground",
    marker: "bg-primary",
    soft: "bg-accent/55",
  },
  danger: {
    icon: "bg-danger-soft text-danger-soft-foreground",
    value: "text-danger-soft-foreground",
    marker: "bg-danger-soft-foreground",
    soft: "bg-danger-soft/55",
  },
  warning: {
    icon: "bg-warning text-warning-foreground",
    value: "text-warning-foreground",
    marker: "bg-warning-foreground",
    soft: "bg-warning/60",
  },
  success: {
    icon: "bg-success text-success-foreground",
    value: "text-success-foreground",
    marker: "bg-success-foreground",
    soft: "bg-success/60",
  },
  info: {
    icon: "bg-info text-info-foreground",
    value: "text-info-foreground",
    marker: "bg-info-foreground",
    soft: "bg-info/60",
  },
  muted: {
    icon: "bg-muted text-muted-foreground",
    value: "text-foreground",
    marker: "bg-muted-foreground",
    soft: "bg-muted/75",
  },
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  timeZone: "UTC",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function buildCarteiraHref(params?: Record<string, string>) {
  const search = new URLSearchParams(params);
  const query = search.toString();

  return query ? `/carteira?${query}` : "/carteira";
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function parseDate(date: string | null) {
  if (!date) {
    return null;
  }

  return new Date(`${date}T00:00:00.000Z`);
}

function formatDate(date: string | null) {
  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return "-";
  }

  return dateFormatter.format(parsedDate);
}

function getPeriodPrefix(month: string, year: string) {
  return `${year}-${month}`;
}

function isInPeriod(date: string | null, month: string, year: string) {
  return Boolean(date?.startsWith(getPeriodPrefix(month, year)));
}

function getDayOfMonth(date: string | null) {
  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return null;
  }

  return parsedDate.getUTCDate();
}

function isWorkedInPeriod(client: CarteiraClient, month: string, year: string) {
  return (
    client.status !== "nao_trabalhado" &&
    isInPeriod(client.ultimaAcao.data, month, year)
  );
}

function isConvertedInPeriod(
  client: CarteiraClient,
  month: string,
  year: string,
) {
  return client.status === "convertido" && isInPeriod(client.ultimaAcao.data, month, year);
}

function isFollowUpOverdue(client: CarteiraClient) {
  return (
    isClientInRecompra(client, TODAY) &&
    ["aguardando", "contatado", "visita"].includes(client.status)
  );
}

function isPending(client: CarteiraClient) {
  if (isClientConverted(client, TODAY)) {
    return false;
  }

  return (
    isFollowUpOverdue(client) ||
    isClientInRecompra(client, TODAY) ||
    client.status === "aguardando" ||
    client.status === "nao_trabalhado" ||
    matchesOperationalLevel(client, "risco", TODAY)
  );
}

function getRecoveredValue(client: CarteiraClient) {
  return client.status === "convertido" ? client.valorUltimoPedido : 0;
}

function buildEvolutionRows(
  clients: CarteiraClient[],
  month: string,
  year: string,
): EvolutionRow[] {
  const weeks = [
    { label: "1-7", start: 1, end: 7 },
    { label: "8-14", start: 8, end: 14 },
    { label: "15-21", start: 15, end: 21 },
    { label: "22-31", start: 22, end: 31 },
  ];

  return weeks.map((week) => {
    const weekClients = clients.filter((client) => {
      if (!isWorkedInPeriod(client, month, year)) {
        return false;
      }

      const day = getDayOfMonth(client.ultimaAcao.data);

      return Boolean(day && day >= week.start && day <= week.end);
    });
    const convertedClients = weekClients.filter(
      (client) => client.status === "convertido",
    );

    return {
      label: week.label,
      contacts: weekClients.length,
      conversions: convertedClients.length,
      recovered: convertedClients.reduce(
        (total, client) => total + getRecoveredValue(client),
        0,
      ),
    };
  });
}

function buildHealthRows(clients: CarteiraClient[]): HealthRow[] {
  const total = clients.length || 1;

  return healthOrder.map((item) => {
    const count = clients.filter((client) =>
      matchesOperationalLevel(client, item.status, TODAY),
    ).length;

    return {
      status: item.status,
      count,
      percent: Math.round((count / total) * 100),
      barClassName: item.barClassName,
    };
  });
}

function buildSellerRows(
  clients: CarteiraClient[],
  month: string,
  year: string,
) {
  const sellers = new Map<string, SellerPerformance>();

  clients.forEach((client) => {
    const current = sellers.get(client.vendedor) ?? {
      vendedor: client.vendedor,
      trabalhados: 0,
      contatos: 0,
      convertidos: 0,
      taxaConversao: 0,
      visitas: 0,
      valorRecuperado: 0,
      pendencias: 0,
      followUpsVencidos: 0,
      pontos: 0,
    };

    if (isWorkedInPeriod(client, month, year)) {
      current.trabalhados += 1;
      current.contatos += 1;
    }

    if (isConvertedInPeriod(client, month, year)) {
      current.convertidos += 1;
      current.valorRecuperado += getRecoveredValue(client);
    }

    if (client.status === "visita" && isInPeriod(client.ultimaAcao.data, month, year)) {
      current.visitas += 1;
    }

    if (isPending(client)) {
      current.pendencias += 1;
    }

    if (isFollowUpOverdue(client)) {
      current.followUpsVencidos += 1;
    }

    sellers.set(client.vendedor, current);
  });

  return Array.from(sellers.values())
    .map((seller) => ({
      ...seller,
      taxaConversao:
        seller.trabalhados > 0
          ? Math.round((seller.convertidos / seller.trabalhados) * 100)
          : 0,
    }))
    .sort((first, second) => {
      if (second.valorRecuperado !== first.valorRecuperado) {
        return second.valorRecuperado - first.valorRecuperado;
      }

      return second.trabalhados - first.trabalhados;
    });
}

function buildPriorityRows(clients: CarteiraClient[]) {
  return clients
    .map<PriorityRow | null>((client) => {
      const motives: string[] = [];
      let score = client.diasSemComprar;

      if (isClientConverted(client, TODAY)) {
        return null;
      }

      if (isFollowUpOverdue(client)) {
        motives.push("Follow-up em atraso");
        score += 500;
      }

      if (matchesOperationalLevel(client, "risco", TODAY)) {
        motives.push("Cliente em risco");
        score += 380;
      }

      if (isClientOldInactive(client, TODAY)) {
        motives.push("Inativo antigo");
        score += 320;
      }

      if (isClientInRecompra(client, TODAY)) {
        motives.push("Recompra");
        score += 260;
      }

      if (client.status === "aguardando") {
        motives.push("Aguardando retorno");
        score += 180;
      }

      if (motives.length === 0) {
        return null;
      }

      return {
        client,
        motivo: Array.from(new Set(motives)).slice(0, 3).join(" · "),
        score,
      };
    })
    .filter((item): item is PriorityRow => Boolean(item))
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return second.client.diasSemComprar - first.client.diasSemComprar;
    })
    .slice(0, 12);
}

function getMonthLabel(month: string) {
  return monthOptions.find((option) => option.value === month)?.label ?? month;
}

function getStatusFilter(status: WorkStatus) {
  return buildCarteiraHref({ status });
}

function isDefaultPeriod(month: string, year: string) {
  return `${year}-${month}` === DEFAULT_MONTH_KEY;
}

function canUseSupabaseTotals(input: {
  isSupabaseActive: boolean;
  month: string;
  year: string;
  vendor: string;
  city: string;
}) {
  return (
    input.isSupabaseActive &&
    isDefaultPeriod(input.month, input.year) &&
    input.vendor === "todos" &&
    input.city === "todas"
  );
}

function DashboardSourceNotice({
  status,
  message,
  metricErrors,
}: {
  status: LoadDashboardResult["status"];
  message?: string;
  metricErrors?: string[];
}) {
  const isLive = status === "available";
  const usesLocalFallback = status === "unconfigured" || status === "empty";

  return (
    <div
      className={cn(
        "mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        isLive
          ? "border-success/60 bg-success/25 text-success-foreground"
          : usesLocalFallback
            ? "border-warning/70 bg-warning/45 text-warning-foreground"
            : "border-danger-soft bg-danger-soft text-danger-soft-foreground",
      )}
    >
      <Database className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <div className="font-medium">
          {isLive
            ? "Dados reais do Supabase"
            : usesLocalFallback
              ? "Dashboard em fallback local"
              : "Supabase conectado com erro parcial"}
        </div>
        <div className="mt-0.5 text-xs leading-5 opacity-85">
          {message ??
            (isLive
              ? "Indicadores calculados com a ultima carteira publicada, interacoes, follow-ups e pontos do mes."
              : usesLocalFallback
                ? "Os dados mockados/localStorage continuam disponiveis enquanto a base real nao estiver pronta."
                : "O Dashboard nao substituiu a base real por dados mockados.")}
        </div>
        {metricErrors?.length ? (
          <ul className="mt-2 space-y-1 text-xs leading-5">
            {metricErrors.map((error) => (
              <li key={error}>Metrica indisponivel: {error}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function KpiLinkCard({ kpi }: { kpi: DashboardKpi }) {
  const Icon = kpi.icon;
  const tone = toneClasses[kpi.tone];

  return (
    <Link
      href={kpi.href}
      title={kpi.description}
      className="group block min-h-[132px] rounded-lg border bg-card p-3 shadow-sm outline-none transition hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("rounded-md p-2", tone.icon)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      </div>
      <div className="mt-4">
        <div className="text-xs font-medium text-muted-foreground">
          {kpi.label}
        </div>
        <div className={cn("mt-1 text-2xl font-semibold", tone.value)}>
          {kpi.value}
        </div>
        <div className="mt-1 text-xs leading-5 text-muted-foreground">
          {kpi.hint}
        </div>
      </div>
    </Link>
  );
}

function OperationalAlerts({ alerts }: { alerts: AlertItem[] }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <CardTitle>Alertas operacionais</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert) => {
          const tone = toneClasses[alert.tone];

          return (
            <Link
              key={alert.label}
              href={alert.href}
              title={alert.description}
              className="flex min-h-16 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm transition hover:border-primary/40 hover:bg-muted/45"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className={cn("h-2.5 w-2.5 rounded-full", tone.marker)} />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">
                    {alert.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {alert.description}
                  </span>
                </span>
              </span>
              <span className={cn("rounded-md px-2 py-1 font-mono text-sm", tone.soft)}>
                {alert.count} de {alert.total}
              </span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}

function BarValue({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className: string;
}) {
  const width = value === 0 ? 0 : Math.max(10, Math.round((value / max) * 100));

  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className={cn("h-2 rounded-full", className)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function EvolutionChart({ rows }: { rows: EvolutionRow[] }) {
  const maxContacts = Math.max(1, ...rows.map((row) => row.contacts));
  const maxConversions = Math.max(1, ...rows.map((row) => row.conversions));
  const maxRecovered = Math.max(1, ...rows.map((row) => row.recovered));

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <CardTitle>Evolução do mês</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 text-[11px] font-semibold uppercase text-muted-foreground sm:grid-cols-[64px_1fr_1fr_1fr] sm:gap-3 sm:text-xs">
          <span>Semana</span>
          <span>
            <span className="sm:hidden">Cont.</span>
            <span className="hidden sm:inline">Contatos</span>
          </span>
          <span>
            <span className="sm:hidden">Conv.</span>
            <span className="hidden sm:inline">Conversões</span>
          </span>
          <span>
            <span className="sm:hidden">R$</span>
            <span className="hidden sm:inline">Recuperado</span>
          </span>
        </div>
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[64px_1fr_1fr_1fr] sm:gap-3"
          >
            <div className="font-mono text-sm text-muted-foreground">
              {row.label}
            </div>
            <div className="min-w-0 space-y-1">
              <BarValue
                value={row.contacts}
                max={maxContacts}
                className="bg-primary"
              />
              <div className="text-xs text-muted-foreground">
                {row.contacts}
                <span className="hidden sm:inline"> contatos</span>
              </div>
            </div>
            <div className="min-w-0 space-y-1">
              <BarValue
                value={row.conversions}
                max={maxConversions}
                className="bg-success-foreground"
              />
              <div className="text-xs text-muted-foreground">
                {row.conversions}
                <span className="hidden sm:inline"> conversões</span>
              </div>
            </div>
            <div className="min-w-0 space-y-1">
              <BarValue
                value={row.recovered}
                max={maxRecovered}
                className="bg-info-foreground"
              />
              <div className="truncate text-xs text-muted-foreground">
                {formatCurrency(row.recovered)}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function HealthOverview({ rows }: { rows: HealthRow[] }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle>Saúde da carteira</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <Link
            key={row.status}
            href={buildCarteiraHref({ classificacao: row.status })}
            className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <StatusBadge status={row.status} />
              <span className="font-mono text-sm text-muted-foreground">
                {row.count} · {row.percent}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className={cn("h-2 rounded-full", row.barClassName)}
                style={{ width: `${row.percent}%` }}
              />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function SellerPerformanceTable({ rows }: { rows: SellerPerformance[] }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <CardTitle>Performance por vendedor</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 md:hidden">
          {rows.map((row) => (
            <Link
              key={row.vendedor}
              href={buildCarteiraHref({ vendedor: row.vendedor })}
              className="block rounded-md border bg-background p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">{row.vendedor}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {row.trabalhados} trabalhados · {row.convertidos} convertidos
                  </div>
                </div>
                <Badge variant={row.pendencias > 0 ? "warning" : "success"}>
                  {row.pendencias} pend.
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Contatos: {row.contatos}</span>
                <span className="text-right">Taxa: {row.taxaConversao}%</span>
                <span>Visitas: {row.visitas}</span>
                <span className="text-right font-medium text-foreground">
                  {formatCurrency(row.valorRecuperado)}
                </span>
                <span>Follow-ups em atraso: {row.followUpsVencidos}</span>
                <span className="text-right">Pontos: {row.pontos}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="hidden md:block">
          <Table className="min-w-[980px] table-density-compact">
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Trabalhados</TableHead>
                <TableHead className="text-right">Contatos</TableHead>
                <TableHead className="text-right">Convertidos</TableHead>
                <TableHead className="text-right">Taxa</TableHead>
                <TableHead className="text-right">Visitas</TableHead>
                <TableHead className="text-right">Valor recuperado</TableHead>
                <TableHead className="text-right">Follow-ups em atraso</TableHead>
                <TableHead className="text-right">Pontos</TableHead>
                <TableHead className="text-right">Pendências</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.vendedor}>
                  <TableCell>
                    <Link
                      href={buildCarteiraHref({ vendedor: row.vendedor })}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {row.vendedor}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.trabalhados}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.contatos}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.convertidos}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.taxaConversao}%
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.visitas}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(row.valorRecuperado)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {row.followUpsVencidos}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-primary">
                    {row.pontos}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={row.pendencias > 0 ? "warning" : "success"}>
                      {row.pendencias}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function PrioritiesTable({ rows }: { rows: PriorityRow[] }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-primary" />
          <CardTitle>Prioridades para ação</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 md:hidden">
          {rows.map(({ client, motivo }) => (
            <div key={client.id} className="rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">
                    {client.cliente}
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {client.cidade}/{client.bairro}
                  </div>
                </div>
                <div className="font-mono text-sm font-semibold">
                  {client.diasSemComprar}d
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge
                  status={getOperationalClientLevel(client, TODAY) ?? "convertido"}
                />
                <StatusBadge status={client.status} />
              </div>
              <div className="mt-3 text-sm text-foreground">{motivo}</div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Badge
                  variant={isClientInRecompra(client, TODAY) ? "danger" : "outline"}
                >
                  {isClientInRecompra(client, TODAY)
                    ? `Recompra · ${formatDate(client.proximaCompra)}`
                    : formatDate(client.proximaCompra)}
                </Badge>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/clientes/${client.id}`}>Ver cliente</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <Table className="min-w-[940px] table-density-compact">
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Dias</TableHead>
                <TableHead>Próxima compra</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ client, motivo }) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="max-w-[220px]">
                      <div className="truncate font-medium text-foreground">
                        {client.cliente}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {client.cidade}/{client.bairro}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[260px] truncate text-sm">
                      {motivo}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        getOperationalClientLevel(client, TODAY) ?? "convertido"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={client.status} />
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {client.diasSemComprar}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        isClientInRecompra(client, TODAY) ? "danger" : "outline"
                      }
                    >
                      {isClientInRecompra(client, TODAY)
                        ? `Recompra · ${formatDate(client.proximaCompra)}`
                        : formatDate(client.proximaCompra)}
                    </Badge>
                  </TableCell>
                  <TableCell>{client.vendedor}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/clientes/${client.id}`}>Ver cliente</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardView({
  initialDashboard,
}: {
  initialDashboard: LoadDashboardResult;
}) {
  const { getSummary } = useGamification();
  const fallbackClients = useCarteiraClientsSource();
  const usesLocalFallback =
    initialDashboard.status === "unconfigured" ||
    initialDashboard.status === "empty";
  const isSupabaseActive = !usesLocalFallback;
  const clients = usesLocalFallback ? fallbackClients : initialDashboard.clients;
  const [month, setMonth] = useState(DEFAULT_MONTH);
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [vendor, setVendor] = useState("todos");
  const [city, setCity] = useState("todas");
  const useSupabaseTotals = canUseSupabaseTotals({
    isSupabaseActive,
    month,
    year,
    vendor,
    city,
  });

  const vendorOptions = useMemo<SelectOption[]>(
    () => [
      { value: "todos", label: "Todos os vendedores" },
      ...Array.from(new Set(clients.map((client) => client.vendedor)))
        .sort((first, second) => first.localeCompare(second, "pt-BR"))
        .map((item) => ({ value: item, label: item })),
    ],
    [clients],
  );

  const cityOptions = useMemo<SelectOption[]>(
    () => [
      { value: "todas", label: "Todas as cidades" },
      ...Array.from(new Set(clients.map((client) => client.cidade)))
        .sort((first, second) => first.localeCompare(second, "pt-BR"))
        .map((item) => ({ value: item, label: item })),
    ],
    [clients],
  );

  const filteredClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          (vendor === "todos" || client.vendedor === vendor) &&
          (city === "todas" || client.cidade === city),
      ),
    [city, clients, vendor],
  );

  const fallbackGamificationSummary = useMemo(
    () => getSummary(getPeriodPrefix(month, year)),
    [getSummary, month, year],
  );
  const gamificationSummary =
    useSupabaseTotals && initialDashboard.gamificationSummary
      ? initialDashboard.gamificationSummary
      : fallbackGamificationSummary;

  const dashboard = useMemo(() => {
    const workedClients = filteredClients.filter((client) =>
      isWorkedInPeriod(client, month, year),
    );
    const convertedClients = filteredClients.filter((client) =>
      isClientConverted(client, TODAY),
    );
    const followUpsOverdue = filteredClients.filter(isFollowUpOverdue);
    const followUpsToday = filteredClients.filter(
      (client) =>
        client.proximaCompra === TODAY &&
        ["aguardando", "contatado", "visita"].includes(client.status),
    );
    const awaitingClients = filteredClients.filter(
      (client) => client.status === "aguardando",
    );
    const visitsClients = filteredClients.filter(
      (client) => client.status === "visita",
    );
    const operationalCounts = buildOperationalCounts(filteredClients, TODAY);
    const recoveredValue = convertedClients.reduce(
      (total, client) => total + getRecoveredValue(client),
      0,
    );
    const fallbackMetrics: DashboardMetrics = {
      totalClientes: operationalCounts.totalClientes,
      saudaveis: operationalCounts.saudaveis,
      atencao: operationalCounts.atencao,
      risco: operationalCounts.risco,
      inativosAntigos: operationalCounts.inativosAntigos,
      recomprasPendentes: operationalCounts.recomprasPendentes,
      trabalhadosMes: workedClients.length,
      naoTrabalhados: operationalCounts.naoTrabalhados,
      convertidos: convertedClients.length,
      valorRecuperado: recoveredValue,
      aguardandoRetorno: awaitingClients.length,
      visitasEncaminhadas: visitsClients.length,
      followUpsVencidos: followUpsOverdue.length,
      followUpsHoje: followUpsToday.length,
      contatosRealizados: workedClients.length,
      pontosMes: gamificationSummary.totalPoints,
      clientesInadimplentes: operationalCounts.clientesInadimplentes,
      clientesBloqueados: operationalCounts.clientesBloqueados,
      negociacoesFinanceiras: operationalCounts.negociacoesFinanceiras,
    };
    const metrics =
      useSupabaseTotals && initialDashboard.metrics
        ? initialDashboard.metrics
        : fallbackMetrics;
    const sellerRows =
      useSupabaseTotals && initialDashboard.sellerRows.length > 0
        ? initialDashboard.sellerRows
        : buildSellerRows(filteredClients, month, year);
    const priorityRows =
      useSupabaseTotals && initialDashboard.priorityRows.length > 0
        ? initialDashboard.priorityRows
        : buildPriorityRows(filteredClients);

    return {
      kpis: [
        {
          label: "Total de clientes",
          value: String(metrics.totalClientes),
          hint: "Clientes da carteira atual",
          description: "Total de clientes da última importação publicada, respeitando os filtros aplicados.",
          href: buildCarteiraHref(),
          icon: Users,
          tone: "default",
        },
        {
          label: operationalIndicatorInfo.atencao.dashboardLabel,
          value: String(metrics.atencao),
          hint: operationalIndicatorInfo.atencao.description,
          description: operationalIndicatorInfo.atencao.description,
          href: buildCarteiraHref({ classificacao: "atencao" }),
          icon: AlertTriangle,
          tone: "warning",
        },
        {
          label: operationalIndicatorInfo.risco.dashboardLabel,
          value: String(metrics.risco),
          hint: operationalIndicatorInfo.risco.description,
          description: operationalIndicatorInfo.risco.description,
          href: buildCarteiraHref({ classificacao: "risco" }),
          icon: AlertTriangle,
          tone: "danger",
        },
        {
          label: operationalIndicatorInfo.inativos.dashboardLabel,
          value: String(metrics.inativosAntigos),
          hint: operationalIndicatorInfo.inativos.description,
          description: operationalIndicatorInfo.inativos.description,
          href: buildCarteiraHref({ classificacao: "inativo" }),
          icon: Clock3,
          tone: "muted",
        },
        {
          label: operationalIndicatorInfo.recompra.dashboardLabel,
          value: String(metrics.recomprasPendentes),
          hint: operationalIndicatorInfo.recompra.description,
          description: operationalIndicatorInfo.recompra.description,
          href: buildCarteiraHref({ proxima: "recompra" }),
          icon: RefreshCw,
          tone: "warning",
        },
        {
          label: "Trabalhados no mês",
          value: String(metrics.trabalhadosMes),
          hint: `Com interação em ${getMonthLabel(month)}/${year}`,
          description: "Clientes com registro comercial no período selecionado.",
          href: buildCarteiraHref(),
          icon: PhoneCall,
          tone: "info",
        },
        {
          label: operationalIndicatorInfo.convertidos.dashboardLabel,
          value: String(metrics.convertidos),
          hint: operationalIndicatorInfo.convertidos.description,
          description: operationalIndicatorInfo.convertidos.description,
          href: getStatusFilter("convertido"),
          icon: CheckCircle2,
          tone: "success",
        },
        {
          label: "Valor recuperado",
          value: formatCurrency(metrics.valorRecuperado),
          hint: "Soma dos convertidos",
          description: "Soma dos valores recuperados em conversões registradas no período.",
          href: getStatusFilter("convertido"),
          icon: DollarSign,
          tone: "success",
        },
        {
          label: "Follow-ups em atraso",
          value: String(metrics.followUpsVencidos),
          hint: "Tarefas com prazo vencido",
          description: "Follow-ups ou tarefas comerciais com prazo anterior a hoje.",
          href: "/agenda",
          icon: RefreshCw,
          tone: "warning",
        },
        {
          label: "Aguardando retorno",
          value: String(metrics.aguardandoRetorno),
          hint: "Clientes já acionados",
          description: "Clientes com status operacional Aguardando retorno.",
          href: getStatusFilter("aguardando"),
          icon: Clock3,
          tone: "warning",
        },
        {
          label: operationalIndicatorInfo.inadimplentes.dashboardLabel,
          value: String(metrics.clientesInadimplentes),
          hint: operationalIndicatorInfo.inadimplentes.description,
          description: operationalIndicatorInfo.inadimplentes.description,
          href: buildCarteiraHref({ financeiro: "inadimplente" }),
          icon: ShieldAlert,
          tone: "danger",
        },
        {
          label: operationalIndicatorInfo.bloqueados.dashboardLabel,
          value: String(metrics.clientesBloqueados),
          hint: operationalIndicatorInfo.bloqueados.description,
          description: operationalIndicatorInfo.bloqueados.description,
          href: buildCarteiraHref({ financeiro: "bloqueado" }),
          icon: ShieldAlert,
          tone: "danger",
        },
        {
          label: operationalIndicatorInfo.negociacoes_financeiras.dashboardLabel,
          value: String(metrics.negociacoesFinanceiras),
          hint: operationalIndicatorInfo.negociacoes_financeiras.description,
          description: operationalIndicatorInfo.negociacoes_financeiras.description,
          href: buildCarteiraHref({ financeiro: "negociacao" }),
          icon: DollarSign,
          tone: "warning",
        },
        {
          label: operationalIndicatorInfo.nao_trabalhados.dashboardLabel,
          value: String(metrics.naoTrabalhados),
          hint: operationalIndicatorInfo.nao_trabalhados.description,
          description: operationalIndicatorInfo.nao_trabalhados.description,
          href: getStatusFilter("nao_trabalhado"),
          icon: ListChecks,
          tone: "muted",
        },
        {
          label: "Visitas encaminhadas",
          value: String(metrics.visitasEncaminhadas),
          hint: "Acompanhamento externo",
          description: "Clientes com visita comercial encaminhada.",
          href: getStatusFilter("visita"),
          icon: Activity,
          tone: "info",
        },
        {
          label: "Follow-ups hoje",
          value: String(metrics.followUpsHoje),
          hint: "Retornos do dia",
          description: "Follow-ups com prazo para hoje.",
          href: "/agenda",
          icon: Clock3,
          tone: "info",
        },
        {
          label: "Contatos realizados",
          value: String(metrics.contatosRealizados),
          hint: `${getMonthLabel(month)}/${year}`,
          description: "Quantidade de interações comerciais registradas no período.",
          href: buildCarteiraHref(),
          icon: PhoneCall,
          tone: "default",
        },
        {
          label: "Pontos do mês",
          value: String(metrics.pontosMes),
          hint: "Gamificação real/local",
          description: "Pontos comerciais gerados no mês pela campanha ativa.",
          href: "/metas",
          icon: BarChart3,
          tone: "success",
        },
      ] satisfies DashboardKpi[],
      alerts: [
        {
          label: "Clientes em risco sem contato",
          count: operationalCounts.riscoSemContato,
          total: metrics.risco,
          description: `${operationalCounts.riscoSemContato} clientes em risco ainda não receberam interação.`,
          href: buildCarteiraHref({
            classificacao: "risco",
            status: "nao_trabalhado",
          }),
          tone: "danger",
        },
        {
          label: "Inativos sem ação",
          count: operationalCounts.inativosSemAcao,
          total: metrics.inativosAntigos,
          description: `${operationalCounts.inativosSemAcao} inativos ainda não possuem registro comercial.`,
          href: buildCarteiraHref({
            classificacao: "inativo",
            status: "nao_trabalhado",
          }),
          tone: "muted",
        },
        {
          label: "Recompras pendentes",
          count: metrics.recomprasPendentes,
          total: metrics.totalClientes,
          description: `${metrics.recomprasPendentes} clientes têm próxima compra prevista já passada.`,
          href: buildCarteiraHref({ proxima: "recompra" }),
          tone: "warning",
        },
        {
          label: "Aguardando retorno",
          count: metrics.aguardandoRetorno,
          total: metrics.totalClientes,
          description: `${metrics.aguardandoRetorno} clientes estão aguardando retorno comercial.`,
          href: getStatusFilter("aguardando"),
          tone: "warning",
        },
      ] satisfies AlertItem[],
      evolutionRows: buildEvolutionRows(filteredClients, month, year),
      healthRows: buildHealthRows(filteredClients),
      sellerRows,
      priorityRows,
    };
  }, [
    filteredClients,
    gamificationSummary.totalPoints,
    initialDashboard.metrics,
    initialDashboard.priorityRows,
    initialDashboard.sellerRows,
    month,
    useSupabaseTotals,
    year,
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Gestão comercial"
        title="Dashboard operacional"
        description="Acompanhe saúde da carteira, produtividade da equipe, follow-ups, pontos e prioridades comerciais."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/agenda">Ver agenda</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/carteira">Abrir carteira</Link>
            </Button>
          </>
        }
      />

      <DashboardSourceNotice
        status={initialDashboard.status}
        message={initialDashboard.message}
        metricErrors={initialDashboard.metricErrors}
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">
          <SelectFilter
            label="Mês"
            value={month}
            options={monthOptions}
            onChange={setMonth}
          />
          <SelectFilter
            label="Ano"
            value={year}
            options={yearOptions}
            onChange={setYear}
          />
          <SelectFilter
            label="Vendedor"
            value={vendor}
            options={vendorOptions}
            onChange={setVendor}
          />
          <SelectFilter
            label="Cidade"
            value={city}
            options={cityOptions}
            onChange={setCity}
          />
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        {dashboard.kpis.map((kpi) => (
          <KpiLinkCard key={kpi.label} kpi={kpi} />
        ))}
      </section>

      <section className="mt-4">
        <MonthlyAchievementsPanel summary={gamificationSummary} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <EvolutionChart rows={dashboard.evolutionRows} />
        <HealthOverview rows={dashboard.healthRows} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SellerPerformanceTable rows={dashboard.sellerRows} />
        <OperationalAlerts alerts={dashboard.alerts} />
      </section>

      <section className="mt-4">
        <PrioritiesTable rows={dashboard.priorityRows} />
      </section>
    </>
  );
}
