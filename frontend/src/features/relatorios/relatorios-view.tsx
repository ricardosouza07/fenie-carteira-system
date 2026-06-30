"use client";

import {
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileSpreadsheet,
  Percent,
  RefreshCw,
  Route,
  Trophy,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
import { useCarteiraClientsSource } from "@/features/carteira/client-store";
import type {
  CarteiraClient,
  ClientLevel,
  WorkStatus,
} from "@/features/carteira/types";
import {
  getClientHealthLabel,
  getOperationalClientLevel,
  isClientConverted,
  isClientInRecompra,
  matchesOperationalLevel,
  operationalIndicatorInfo,
} from "@/features/carteira/operational-rules";
import { useGamification } from "@/features/gamification/gamification-provider";
import type { PointEvent } from "@/features/gamification/types";
import { getCurrentPeriod } from "@/lib/current-period";
import { cn } from "@/lib/utils";

import type {
  ChannelLabel,
  ClientTypeLabel,
  ConvertedRow,
  FollowUpRow,
  LoadRelatoriosResult,
  PointRow,
  SellerPerformanceRow,
  WorkedRow,
} from "./types";

const CURRENT_PERIOD = getCurrentPeriod();
const TODAY = CURRENT_PERIOD.date;
const DEFAULT_PERIOD = CURRENT_PERIOD.monthKey;

type SelectOption = {
  value: string;
  label: string;
};

type StatusFilter = "todos" | WorkStatus;
type LevelFilter = "todas" | ClientLevel;
type ReportTab =
  | "trabalhados"
  | "convertidos"
  | "performance"
  | "followups"
  | "pontos";
type KpiTone = "default" | "success" | "warning" | "info" | "danger";

type SummaryKpi = {
  label: string;
  value: string;
  hint: string;
  description: string;
  icon: LucideIcon;
  tone: KpiTone;
};

type ReportData = {
  workedRows: WorkedRow[];
  convertedRows: ConvertedRow[];
  followUpRows: FollowUpRow[];
  pointRows: PointRow[];
  sellerRows: SellerPerformanceRow[];
  summary: SummaryKpi[];
};

const monthLabels: Record<string, string> = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  "10": "Outubro",
  "11": "Novembro",
  "12": "Dezembro",
};

const statusOptions: SelectOption[] = [
  { value: "todos", label: "Todos os status" },
  { value: "nao_trabalhado", label: "Não trabalhado" },
  { value: "contatado", label: "Contatado" },
  { value: "aguardando", label: "Aguardando retorno" },
  { value: "convertido", label: "Convertido" },
  { value: "visita", label: "Visita encaminhada" },
];

const levelOptions: SelectOption[] = [
  { value: "todas", label: "Todas as classificações" },
  { value: "saudavel", label: getClientHealthLabel("saudavel") },
  { value: "atencao", label: getClientHealthLabel("atencao") },
  { value: "risco", label: getClientHealthLabel("risco") },
  { value: "inativo", label: getClientHealthLabel("inativo") },
];

const tabs: { value: ReportTab; label: string }[] = [
  { value: "trabalhados", label: "Clientes trabalhados" },
  { value: "convertidos", label: "Convertidos" },
  { value: "performance", label: "Performance por vendedor" },
  { value: "followups", label: "Follow-ups" },
  { value: "pontos", label: "Pontos" },
];

const kpiToneClasses: Record<
  KpiTone,
  {
    icon: string;
    value: string;
  }
> = {
  default: {
    icon: "bg-accent text-primary",
    value: "text-foreground",
  },
  success: {
    icon: "bg-success text-success-foreground",
    value: "text-success-foreground",
  },
  warning: {
    icon: "bg-warning text-warning-foreground",
    value: "text-warning-foreground",
  },
  info: {
    icon: "bg-info text-info-foreground",
    value: "text-info-foreground",
  },
  danger: {
    icon: "bg-danger-soft text-danger-soft-foreground",
    value: "text-danger-soft-foreground",
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

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

function formatPeriod(period: string) {
  const [year, month] = period.split("-");

  return `${monthLabels[month] ?? month}/${year}`;
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`;
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

function isInPeriod(date: string | null, period: string) {
  return Boolean(date?.startsWith(period));
}

function isOverdue(date: string | null) {
  return Boolean(date && date < TODAY);
}

function getOperationalBadgeStatus(client: CarteiraClient) {
  return getOperationalClientLevel(client, TODAY) ?? "convertido";
}

function getOperationalClassificationLabel(client: CarteiraClient) {
  const level = getOperationalClientLevel(client, TODAY);

  return level ? getClientHealthLabel(level) : "Convertido";
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function uniqueCount(values: string[]) {
  return new Set(values).size;
}

function getConversionRate(worked: number, converted: number) {
  if (worked === 0) {
    return 0;
  }

  return (converted / worked) * 100;
}

function inferChannel(client: CarteiraClient): ChannelLabel {
  const action = normalizeText(client.ultimaAcao.tipo);

  if (action.includes("whatsapp") || action.includes("mensagem")) {
    return "WhatsApp";
  }

  if (action.includes("e-mail") || action.includes("email")) {
    return "E-mail";
  }

  if (action.includes("visita")) {
    return "Presencial";
  }

  return "Telefone";
}

function inferClientType(client: CarteiraClient): ClientTypeLabel {
  if (client.diasSemComprar <= 30) {
    return "Novo";
  }

  if (client.cidade === "Curitiba") {
    return "Loja";
  }

  if (matchesOperationalLevel(client, "inativo", TODAY)) {
    return "Externo";
  }

  return "Espontaneo";
}

function getRecoveredValue(client: CarteiraClient) {
  return client.status === "convertido" ? client.valorUltimoPedido : 0;
}

function isWorked(client: CarteiraClient, period: string) {
  return (
    client.status !== "nao_trabalhado" &&
    isInPeriod(client.ultimaAcao.data, period)
  );
}

function isConverted(client: CarteiraClient, period: string) {
  return isClientConverted(client, TODAY) && isInPeriod(client.ultimaAcao.data, period);
}

function isVisit(client: CarteiraClient) {
  return client.status === "visita";
}

function getFollowUpMotivo(client: CarteiraClient) {
  if (client.status === "aguardando") {
    return "Aguardando retorno";
  }

  if (client.status === "visita") {
    return "Visita encaminhada";
  }

  if (isOverdue(client.proximaCompra)) {
    return "Recompra";
  }

  return "Próxima compra prevista";
}

function isPending(client: CarteiraClient) {
  if (isClientConverted(client, TODAY)) {
    return false;
  }

  return (
    client.status === "aguardando" ||
    client.status === "nao_trabalhado" ||
    matchesOperationalLevel(client, "risco", TODAY) ||
    isClientInRecompra(client, TODAY)
  );
}

function buildPeriodOptions(input: {
  clients: CarteiraClient[];
  workedRows: WorkedRow[];
  convertedRows: ConvertedRow[];
  followUpRows: FollowUpRow[];
  pointRows: PointRow[];
}) {
  const periods = new Set<string>([DEFAULT_PERIOD]);

  input.clients.forEach((client) => {
    [
      client.ultimaAcao.data,
      client.proximaCompra,
      client.ultimoPedido,
    ].forEach((date) => {
      if (date) {
        periods.add(date.slice(0, 7));
      }
    });
  });

  input.workedRows.forEach((row) => periods.add(row.dataInteracao.slice(0, 7)));
  input.convertedRows.forEach((row) => periods.add(row.dataConversao.slice(0, 7)));
  input.followUpRows.forEach((row) => periods.add(row.prazo.slice(0, 7)));
  input.pointRows.forEach((row) => periods.add(row.data.slice(0, 7)));

  return Array.from(periods)
    .sort((first, second) => second.localeCompare(first))
    .map((period) => ({
      value: period,
      label: formatPeriod(period),
    }));
}

function buildFallbackWorkedRows(
  clients: CarteiraClient[],
  period: string,
): WorkedRow[] {
  return clients
    .filter((client) => isWorked(client, period))
    .map((client) => ({
      id: `worked-${client.id}`,
      client,
      canal: inferChannel(client),
      dataInteracao: client.ultimaAcao.data ?? period,
    }))
    .sort((first, second) =>
      second.dataInteracao.localeCompare(first.dataInteracao),
    );
}

function buildFallbackConvertedRows(
  clients: CarteiraClient[],
  period: string,
): ConvertedRow[] {
  return clients
    .filter((client) => isConverted(client, period))
    .map((client) => ({
      id: `converted-${client.id}`,
      client,
      valorRecuperado: getRecoveredValue(client),
      dataConversao: client.ultimaAcao.data ?? period,
      origem: inferClientType(client),
    }))
    .sort((first, second) =>
      second.dataConversao.localeCompare(first.dataConversao),
    );
}

function buildFallbackFollowUpRows(
  clients: CarteiraClient[],
  period: string,
): FollowUpRow[] {
  return clients
    .filter(
      (client) =>
        client.proximaCompra &&
        isInPeriod(client.proximaCompra, period) &&
        !isClientConverted(client, TODAY),
    )
    .map((client) => {
      const prazo = client.proximaCompra ?? period;

      return {
        id: `follow-up-${client.id}`,
        client,
        prazo,
        status: isOverdue(prazo) ? "Em atraso" : "Aberto",
        motivo: getFollowUpMotivo(client),
        situacao: isOverdue(prazo) ? "Em atraso" : "No prazo",
      } satisfies FollowUpRow;
    })
    .sort((first, second) => first.prazo.localeCompare(second.prazo));
}

function buildFallbackPointRows(
  events: PointEvent[],
  clients: CarteiraClient[],
): PointRow[] {
  const clientsById = new Map(clients.map((client) => [client.id, client]));

  return events.map((event) => ({
    id: event.id,
    client: clientsById.get(event.customerId) ?? null,
    vendedor: event.vendedor,
    pontos: event.pontos,
    acao: event.acao,
    descricao: event.descricao,
    origem: event.origem,
    data: event.data,
  }));
}

function clientMatchesFilters(
  client: CarteiraClient,
  filters: {
    vendor: string;
    city: string;
    status: StatusFilter;
    level: LevelFilter;
  },
) {
  return (
    (filters.vendor === "todos" || client.vendedor === filters.vendor) &&
    (filters.city === "todas" || client.cidade === filters.city) &&
    (filters.status === "todos" ||
      (filters.status === "convertido"
        ? isClientConverted(client, TODAY)
        : client.status === filters.status)) &&
    (filters.level === "todas" ||
      matchesOperationalLevel(client, filters.level, TODAY))
  );
}

function pointMatchesFilters(
  row: PointRow,
  filters: {
    vendor: string;
    city: string;
    status: StatusFilter;
    level: LevelFilter;
  },
) {
  if (filters.vendor !== "todos" && row.vendedor !== filters.vendor) {
    return false;
  }

  if (!row.client) {
    return (
      filters.city === "todas" &&
      filters.status === "todos" &&
      filters.level === "todas"
    );
  }

  return clientMatchesFilters(row.client, filters);
}

function buildSellerPerformanceRows(input: {
  clients: CarteiraClient[];
  workedRows: WorkedRow[];
  convertedRows: ConvertedRow[];
  followUpRows: FollowUpRow[];
  pointRows: PointRow[];
}) {
  const sellers = new Map<string, SellerPerformanceRow>();

  function ensureSeller(vendedor: string) {
    const current = sellers.get(vendedor) ?? {
      vendedor,
      contatos: 0,
      convertidos: 0,
      taxaConversao: 0,
      visitas: 0,
      valorRecuperado: 0,
      pendencias: 0,
      followUpsEmAtraso: 0,
      pontos: 0,
    };

    sellers.set(vendedor, current);

    return current;
  }

  input.clients.forEach((client) => {
    const seller = ensureSeller(client.vendedor);

    if (isPending(client)) {
      seller.pendencias += 1;
    }
  });

  input.workedRows.forEach((row) => {
    const seller = ensureSeller(row.client.vendedor);

    seller.contatos += 1;

    if (isVisit(row.client)) {
      seller.visitas += 1;
    }
  });

  input.convertedRows.forEach((row) => {
    const seller = ensureSeller(row.client.vendedor);

    seller.convertidos += 1;
    seller.valorRecuperado += row.valorRecuperado;
  });

  input.followUpRows.forEach((row) => {
    const seller = ensureSeller(row.client.vendedor);

    if (row.situacao === "Em atraso") {
      seller.followUpsEmAtraso += 1;
      seller.pendencias += 1;
    }
  });

  input.pointRows.forEach((row) => {
    const seller = ensureSeller(row.vendedor);

    seller.pontos += row.pontos;
  });

  return Array.from(sellers.values())
    .map((seller) => ({
      ...seller,
      taxaConversao: getConversionRate(seller.contatos, seller.convertidos),
    }))
    .sort((first, second) => {
      if (second.valorRecuperado !== first.valorRecuperado) {
        return second.valorRecuperado - first.valorRecuperado;
      }

      if (second.pontos !== first.pontos) {
        return second.pontos - first.pontos;
      }

      return second.contatos - first.contatos;
    });
}

function buildReport(input: {
  clients: CarteiraClient[];
  workedRows: WorkedRow[];
  convertedRows: ConvertedRow[];
  followUpRows: FollowUpRow[];
  pointRows: PointRow[];
}): ReportData {
  const sellerRows = buildSellerPerformanceRows(input);
  const workedCustomers = uniqueCount(
    input.workedRows.map((row) => row.client.id),
  );
  const convertedCustomers = uniqueCount(
    input.convertedRows.map((row) => row.client.id),
  );
  const recoveredValue = input.convertedRows.reduce(
    (total, row) => total + row.valorRecuperado,
    0,
  );
  const visits = input.workedRows.filter((row) => isVisit(row.client)).length;
  const overdueFollowUps = input.followUpRows.filter(
    (row) => row.situacao === "Em atraso",
  ).length;
  const generatedPoints = input.pointRows.reduce(
    (total, row) => total + row.pontos,
    0,
  );

  return {
    ...input,
    sellerRows,
    summary: [
      {
        label: "Clientes trabalhados",
        value: String(workedCustomers),
        hint: "Clientes únicos com ação no período",
        description: "Clientes com interação comercial registrada no período filtrado.",
        icon: Users,
        tone: "info",
      },
      {
        label: "Convertidos no período",
        value: String(convertedCustomers),
        hint: operationalIndicatorInfo.convertidos.description,
        description: operationalIndicatorInfo.convertidos.description,
        icon: CheckCircle2,
        tone: "success",
      },
      {
        label: "Taxa de conversão",
        value: formatPercent(getConversionRate(workedCustomers, convertedCustomers)),
        hint: "Convertidos sobre trabalhados",
        description: "Percentual de clientes convertidos sobre clientes trabalhados no período.",
        icon: Percent,
        tone: "default",
      },
      {
        label: "Valor recuperado",
        value: formatCurrency(recoveredValue),
        hint: "Soma das conversoes",
        description: "Soma dos valores recuperados em conversões no período.",
        icon: FileSpreadsheet,
        tone: "success",
      },
      {
        label: "Visitas encaminhadas",
        value: String(visits),
        hint: "Acoes presenciais no periodo",
        description: "Clientes com visita encaminhada dentro do período filtrado.",
        icon: Route,
        tone: "info",
      },
      {
        label: "Follow-ups em atraso",
        value: String(overdueFollowUps),
        hint: "Prazos em atraso no filtro",
        description: "Follow-ups ou tarefas com prazo anterior a hoje.",
        icon: Clock3,
        tone: overdueFollowUps > 0 ? "warning" : "success",
      },
      {
        label: "Pontos gerados",
        value: String(generatedPoints),
        hint: "Gamificação no período",
        description: "Pontos comerciais gerados pela campanha no período filtrado.",
        icon: Trophy,
        tone: "success",
      },
    ],
  };
}

function getExportRows(report: ReportData, activeTab: ReportTab) {
  if (activeTab === "trabalhados") {
    return report.workedRows.map((row) => ({
      cliente: row.client.cliente,
      vendedor: row.client.vendedor,
      cidade: row.client.cidade,
      classificacao: getOperationalClassificationLabel(row.client),
      status: row.client.status,
      ultimaAcao: row.client.ultimaAcao.tipo,
      canal: row.canal,
      dataInteracao: row.dataInteracao,
    }));
  }

  if (activeTab === "convertidos") {
    return report.convertedRows.map((row) => ({
      cliente: row.client.cliente,
      vendedor: row.client.vendedor,
      cidade: row.client.cidade,
      valorRecuperado: row.valorRecuperado,
      dataConversao: row.dataConversao,
      origem: row.origem,
    }));
  }

  if (activeTab === "performance") {
    return report.sellerRows;
  }

  if (activeTab === "followups") {
    return report.followUpRows.map((row) => ({
      cliente: row.client.cliente,
      vendedor: row.client.vendedor,
      prazo: row.prazo,
      status: row.status,
      motivo: row.motivo,
      situacao: row.situacao,
    }));
  }

  return report.pointRows.map((row) => ({
    cliente: row.client?.cliente ?? "-",
    vendedor: row.vendedor,
    pontos: row.pontos,
    acao: row.acao,
    descricao: row.descricao,
    origem: row.origem,
    data: row.data,
  }));
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
  description,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  description?: string;
}) {
  return (
    <label className="min-w-0" title={description}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <select
        title={description ?? label}
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

function SourceNotice({
  status,
  message,
}: {
  status: LoadRelatoriosResult["status"];
  message?: string;
}) {
  const isLive = status === "available";

  return (
    <div
      className={cn(
        "mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        isLive
          ? "border-success/60 bg-success/25 text-success-foreground"
          : "border-warning/70 bg-warning/45 text-warning-foreground",
      )}
    >
      <Database className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <div className="font-medium">
          {isLive ? "Relatorios com dados do Supabase" : "Relatorios em fallback local"}
        </div>
        <div className="mt-0.5 text-xs leading-5 opacity-85">
          {message ??
            (isLive
              ? "Fechamento calculado com carteira atual, interações, conversões, follow-ups, pontos e vendedores reais."
              : "Os dados mockados/localStorage continuam disponiveis enquanto a base real nao estiver pronta.")}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ item }: { item: SummaryKpi }) {
  const Icon = item.icon;
  const tone = kpiToneClasses[item.tone];

  return (
    <Card className="min-w-0" title={item.description}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">
              {item.label}
            </div>
            <div className={cn("mt-1 text-2xl font-semibold", tone.value)}>
              {item.value}
            </div>
            <div className="mt-1 truncate text-xs text-muted-foreground">
              {item.hint}
            </div>
          </div>
          <div className={cn("rounded-md p-2", tone.icon)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyReportState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed bg-muted/35 p-6 text-center text-sm text-muted-foreground">
      Nenhum registro encontrado em {label}.
    </div>
  );
}

function ReportSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{title}</CardTitle>
          <Badge variant="outline">{count} registros</Badge>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function WorkedTable({
  rows,
  periodLabel,
}: {
  rows: WorkedRow[];
  periodLabel: string;
}) {
  if (rows.length === 0) {
    return <EmptyReportState label={periodLabel} />;
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{row.client.cliente}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {row.client.vendedor} · {row.client.cidade}
                </div>
              </div>
              <Badge variant="outline">{row.canal}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={getOperationalBadgeStatus(row.client)} />
              <StatusBadge status={row.client.status} />
            </div>
            <div className="mt-3 text-sm">{row.client.ultimaAcao.tipo}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {formatDate(row.dataInteracao)}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <Table className="min-w-[920px] table-density-compact">
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Classificação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ultima acao</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Data da interacao</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="max-w-[220px] truncate font-medium">
                    {row.client.cliente}
                  </div>
                </TableCell>
                <TableCell>{row.client.vendedor}</TableCell>
                <TableCell>{row.client.cidade}</TableCell>
                <TableCell>
                  <StatusBadge status={getOperationalBadgeStatus(row.client)} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.client.status} />
                </TableCell>
                <TableCell>
                  <div className="max-w-[210px] truncate">
                    {row.client.ultimaAcao.tipo}
                  </div>
                </TableCell>
                <TableCell>{row.canal}</TableCell>
                <TableCell>{formatDate(row.dataInteracao)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function ConvertedTable({
  rows,
  periodLabel,
}: {
  rows: ConvertedRow[];
  periodLabel: string;
}) {
  if (rows.length === 0) {
    return <EmptyReportState label={periodLabel} />;
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{row.client.cliente}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {row.client.vendedor} · {row.client.cidade}
                </div>
              </div>
              <Badge variant="success">{row.origem}</Badge>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="font-semibold">
                {formatCurrency(row.valorRecuperado)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(row.dataConversao)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <Table className="min-w-[780px] table-density-compact">
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead className="text-right">Valor recuperado</TableHead>
              <TableHead>Data da conversão</TableHead>
              <TableHead>Tipo/origem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="max-w-[240px] truncate font-medium">
                    {row.client.cliente}
                  </div>
                </TableCell>
                <TableCell>{row.client.vendedor}</TableCell>
                <TableCell>{row.client.cidade}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(row.valorRecuperado)}
                </TableCell>
                <TableCell>{formatDate(row.dataConversao)}</TableCell>
                <TableCell>{row.origem}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function SellerPerformanceTable({
  rows,
  periodLabel,
}: {
  rows: SellerPerformanceRow[];
  periodLabel: string;
}) {
  if (rows.length === 0) {
    return <EmptyReportState label={periodLabel} />;
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div key={row.vendedor} className="rounded-md border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{row.vendedor}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {row.contatos} contatos · {row.convertidos} convertidos
                </div>
              </div>
              <Badge variant={row.pendencias > 0 ? "warning" : "success"}>
                {row.pendencias} pend.
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span>Taxa: {formatPercent(row.taxaConversao)}</span>
              <span>Visitas: {row.visitas}</span>
              <span>Em atraso: {row.followUpsEmAtraso}</span>
              <span>Pontos: {row.pontos}</span>
              <span className="col-span-2 font-medium text-foreground">
                {formatCurrency(row.valorRecuperado)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <Table className="min-w-[980px] table-density-compact">
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Contatos</TableHead>
              <TableHead className="text-right">Convertidos</TableHead>
              <TableHead className="text-right">Taxa de conversão</TableHead>
              <TableHead className="text-right">Visitas encaminhadas</TableHead>
              <TableHead className="text-right">Valor recuperado</TableHead>
              <TableHead className="text-right">Follow-ups em atraso</TableHead>
              <TableHead className="text-right">Pontos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.vendedor}>
                <TableCell className="font-medium">{row.vendedor}</TableCell>
                <TableCell className="text-right font-mono">
                  {row.contatos}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {row.convertidos}
                </TableCell>
                <TableCell className="text-right">
                  {formatPercent(row.taxaConversao)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {row.visitas}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(row.valorRecuperado)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {row.followUpsEmAtraso}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold text-primary">
                  {row.pontos}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function FollowUpsTable({
  rows,
  periodLabel,
}: {
  rows: FollowUpRow[];
  periodLabel: string;
}) {
  if (rows.length === 0) {
    return <EmptyReportState label={periodLabel} />;
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{row.client.cliente}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {row.client.vendedor} · {formatDate(row.prazo)}
                </div>
              </div>
              <Badge variant={row.situacao === "Em atraso" ? "danger" : "success"}>
                {row.situacao}
              </Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={row.client.status} />
              <Badge variant="outline">{row.status}</Badge>
              <Badge variant="outline">{row.motivo}</Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <Table className="min-w-[820px] table-density-compact">
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="max-w-[240px] truncate font-medium">
                    {row.client.cliente}
                  </div>
                </TableCell>
                <TableCell>{row.client.vendedor}</TableCell>
                <TableCell>{formatDate(row.prazo)}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.motivo}</TableCell>
                <TableCell>
                  <Badge
                    variant={row.situacao === "Em atraso" ? "danger" : "success"}
                  >
                    {row.situacao}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function PointsTable({
  rows,
  periodLabel,
}: {
  rows: PointRow[];
  periodLabel: string;
}) {
  if (rows.length === 0) {
    return <EmptyReportState label={periodLabel} />;
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {row.client?.cliente ?? row.descricao}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {row.vendedor} · {formatDate(row.data)}
                </div>
              </div>
              <Badge variant="success">+{row.pontos} pts</Badge>
            </div>
            <div className="mt-3 text-sm">{row.descricao}</div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <Table className="min-w-[840px] table-density-compact">
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Acao</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Pontos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="max-w-[220px] truncate font-medium">
                    {row.client?.cliente ?? "-"}
                  </div>
                </TableCell>
                <TableCell>{row.vendedor}</TableCell>
                <TableCell>{row.acao}</TableCell>
                <TableCell>
                  <div className="max-w-[240px] truncate">{row.descricao}</div>
                </TableCell>
                <TableCell>{row.origem}</TableCell>
                <TableCell>{formatDate(row.data)}</TableCell>
                <TableCell className="text-right font-mono font-semibold text-primary">
                  {row.pontos}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export function RelatoriosView({
  initialRelatorios,
}: {
  initialRelatorios: LoadRelatoriosResult;
}) {
  const fallbackClients = useCarteiraClientsSource();
  const { events } = useGamification();
  const isSupabaseActive = initialRelatorios.status === "available";
  const clients = isSupabaseActive ? initialRelatorios.clients : fallbackClients;
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [vendor, setVendor] = useState("todos");
  const [city, setCity] = useState("todas");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [level, setLevel] = useState<LevelFilter>("todas");
  const [activeTab, setActiveTab] = useState<ReportTab>("trabalhados");
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const rawRows = useMemo(() => {
    if (isSupabaseActive) {
      return {
        workedRows: initialRelatorios.workedRows,
        convertedRows: initialRelatorios.convertedRows,
        followUpRows: initialRelatorios.followUpRows,
        pointRows: initialRelatorios.pointRows,
      };
    }

    return {
      workedRows: buildFallbackWorkedRows(clients, period),
      convertedRows: buildFallbackConvertedRows(clients, period),
      followUpRows: buildFallbackFollowUpRows(clients, period),
      pointRows: buildFallbackPointRows(events, clients),
    };
  }, [
    clients,
    events,
    initialRelatorios.convertedRows,
    initialRelatorios.followUpRows,
    initialRelatorios.pointRows,
    initialRelatorios.workedRows,
    isSupabaseActive,
    period,
  ]);

  const periodOptions = useMemo(
    () =>
      buildPeriodOptions({
        clients,
        ...rawRows,
      }),
    [clients, rawRows],
  );

  const vendorOptions = useMemo<SelectOption[]>(
    () => [
      { value: "todos", label: "Todos os vendedores" },
      ...Array.from(
        new Set([
          ...clients.map((client) => client.vendedor),
          ...rawRows.pointRows.map((row) => row.vendedor),
        ]),
      )
        .sort((first, second) => first.localeCompare(second, "pt-BR"))
        .map((item) => ({ value: item, label: item })),
    ],
    [clients, rawRows.pointRows],
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
      clients.filter((client) =>
        clientMatchesFilters(client, { vendor, city, status, level }),
      ),
    [city, clients, level, status, vendor],
  );

  const report = useMemo(() => {
    const filters = { vendor, city, status, level };
    const workedRows = rawRows.workedRows.filter(
      (row) =>
        isInPeriod(row.dataInteracao, period) &&
        clientMatchesFilters(row.client, filters),
    );
    const convertedRows = rawRows.convertedRows.filter(
      (row) =>
        isInPeriod(row.dataConversao, period) &&
        clientMatchesFilters(row.client, filters),
    );
    const followUpRows = rawRows.followUpRows.filter(
      (row) =>
        isInPeriod(row.prazo, period) &&
        clientMatchesFilters(row.client, filters),
    );
    const pointRows = rawRows.pointRows.filter(
      (row) =>
        isInPeriod(row.data, period) &&
        pointMatchesFilters(row, filters),
    );

    return buildReport({
      clients: filteredClients,
      workedRows,
      convertedRows,
      followUpRows,
      pointRows,
    });
  }, [city, filteredClients, level, period, rawRows, status, vendor]);

  const periodLabel = formatPeriod(period);
  const tabCounts: Record<ReportTab, number> = {
    trabalhados: report.workedRows.length,
    convertidos: report.convertedRows.length,
    performance: report.sellerRows.length,
    followups: report.followUpRows.length,
    pontos: report.pointRows.length,
  };

  function handleExport() {
    const currentTabLabel =
      tabs.find((tab) => tab.value === activeTab)?.label ?? "Relatorio";
    const exportRows = getExportRows(report, activeTab);

    setExportFeedback(
      `Exportacao de ${currentTabLabel.toLowerCase()} (${exportRows.length} registros) sera conectada ao banco na proxima fase.`,
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Fechamento mensal"
        title="Relatorios"
        description="Consolide o trabalho da equipe por periodo, vendedor, cidade, status e classificacao."
        actions={
          <Button size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        }
      />

      <SourceNotice
        status={initialRelatorios.status}
        message={initialRelatorios.message}
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-5">
          <SelectFilter
            label="Período/mês"
            value={period}
            options={periodOptions}
            description="Período usado para interações, conversões, follow-ups e pontos."
            onChange={setPeriod}
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
          <SelectFilter
            label="Status"
            value={status}
            options={statusOptions}
            description="Status operacional definido pela última interação comercial registrada."
            onChange={(value) => setStatus(value as StatusFilter)}
          />
          <SelectFilter
            label="Classificação"
            value={level}
            options={levelOptions}
            description="Saúde comercial calculada por dias sem comprar. Convertidos recentes não entram em Atenção, Risco, Inativo ou Recompra."
            onChange={(value) => setLevel(value as LevelFilter)}
          />
        </CardContent>
      </Card>

      {exportFeedback ? (
        <div
          role="status"
          className="mb-4 flex items-start gap-3 rounded-lg border border-info bg-info/55 px-3 py-2 text-sm text-info-foreground"
        >
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{exportFeedback}</span>
        </div>
      ) : null}

      <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        {report.summary.map((item) => (
          <SummaryCard key={item.label} item={item} />
        ))}
      </section>

      <div className="mb-4 grid gap-2 rounded-lg border bg-card p-1 shadow-sm sm:grid-cols-2 xl:grid-cols-5">
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            variant={activeTab === tab.value ? "subtle" : "ghost"}
            size="sm"
            className="justify-between"
            onClick={() => setActiveTab(tab.value)}
          >
            <span className="truncate">{tab.label}</span>
            <span className="rounded bg-card/80 px-1.5 py-0.5 font-mono text-[11px]">
              {tabCounts[tab.value]}
            </span>
          </Button>
        ))}
      </div>

      {activeTab === "trabalhados" ? (
        <ReportSection
          title="Clientes trabalhados"
          count={report.workedRows.length}
        >
          <WorkedTable rows={report.workedRows} periodLabel={periodLabel} />
        </ReportSection>
      ) : null}

      {activeTab === "convertidos" ? (
        <ReportSection title="Convertidos" count={report.convertedRows.length}>
          <ConvertedTable
            rows={report.convertedRows}
            periodLabel={periodLabel}
          />
        </ReportSection>
      ) : null}

      {activeTab === "performance" ? (
        <ReportSection
          title="Performance por vendedor"
          count={report.sellerRows.length}
        >
          <SellerPerformanceTable
            rows={report.sellerRows}
            periodLabel={periodLabel}
          />
        </ReportSection>
      ) : null}

      {activeTab === "followups" ? (
        <ReportSection title="Follow-ups" count={report.followUpRows.length}>
          <FollowUpsTable rows={report.followUpRows} periodLabel={periodLabel} />
        </ReportSection>
      ) : null}

      {activeTab === "pontos" ? (
        <ReportSection title="Pontos" count={report.pointRows.length}>
          <PointsTable rows={report.pointRows} periodLabel={periodLabel} />
        </ReportSection>
      ) : null}
    </>
  );
}
