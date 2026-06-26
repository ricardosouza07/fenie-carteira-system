"use client";

import {
  ArrowDown,
  ArrowUp,
  CalendarPlus,
  Download,
  Eye,
  Loader2,
  MessageCircle,
  PhoneCall,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ColumnVisibilityMenu } from "@/components/shared/column-visibility-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { useTableColumnPreferences } from "@/components/shared/table-column-preferences";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthContext } from "@/features/auth/client-context";
import { useGamification } from "@/features/gamification/gamification-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentPeriod } from "@/lib/current-period";
import { cn } from "@/lib/utils";

import {
  CARTEIRA_COLUMNS_STORAGE_KEY,
  carteiraColumnPresets,
  carteiraColumns,
  carteiraColumnWidths,
  type CarteiraColumnId,
} from "./column-config";
import {
  getCarteiraClientsWithPublishedImports,
  persistImportedClientUpdate,
  saveSupabaseCarteiraSnapshot,
} from "./client-store";
import {
  loadCarteiraFromSupabaseAction,
  saveInteractionToSupabaseAction,
} from "./actions";
import {
  financialStatusFilterOptions,
  getClientFinancialStatus,
  normalizeFinancialStatus,
} from "./financial-status";
import {
  getClientHealthLabel,
  getOperationalClientLevel,
  isClientConverted,
  isClientInRecompra,
  matchesOperationalLevel,
} from "./operational-rules";
import { InteractionDrawer } from "./interaction-drawer";
import {
  buildPersistenceToast,
  InteractionPersistenceToastStack,
  type PersistenceToast,
} from "./interaction-persistence-toast";
import type {
  CarteiraSupabaseImportInfo,
  SaveInteractionSupabaseResult,
} from "./server-types";
import type {
  CarteiraClient,
  CarteiraInteraction,
  CarteiraInteractionInput,
  ClientLevel,
  ContactChannel,
  ContactStatus,
  FinancialStatus,
  WorkStatus,
} from "./types";

const TODAY = getCurrentPeriod().date;
const DEFAULT_PAGE_SIZE = 10;

type SortKey = "diasSemComprar" | "ultimoPedido";
type SortDirection = "asc" | "desc";
type QuickFilter =
  | "todos"
  | "atencao"
  | "risco"
  | "inativos"
  | "nao_trabalhados"
  | "convertidos"
  | "recompra";
type NextPurchaseFilter =
  | "todas"
  | "recompra"
  | "proximos_7"
  | "proximos_15"
  | "futuras"
  | "sem_previsao";
type CarteiraSourceState = {
  status: "loading" | "supabase" | "fallback" | "empty" | "error";
  message: string | null;
  importacao: CarteiraSupabaseImportInfo | null;
};

const levelOptions: { value: "todas" | ClientLevel; label: string }[] = [
  { value: "todas", label: "Todas as classificações" },
  { value: "saudavel", label: getClientHealthLabel("saudavel") },
  { value: "atencao", label: getClientHealthLabel("atencao") },
  { value: "risco", label: getClientHealthLabel("risco") },
  { value: "inativo", label: getClientHealthLabel("inativo") },
];

const statusOptions: { value: "todos" | WorkStatus; label: string }[] = [
  { value: "todos", label: "Todos os status" },
  { value: "nao_trabalhado", label: "Não trabalhado" },
  { value: "contatado", label: "Contatado" },
  { value: "aguardando", label: "Aguardando retorno" },
  { value: "convertido", label: "Convertido" },
  { value: "visita", label: "Visita encaminhada" },
];

const nextPurchaseOptions: { value: NextPurchaseFilter; label: string }[] = [
  { value: "todas", label: "Todas as próximas compras" },
  { value: "recompra", label: "Recompra" },
  { value: "proximos_7", label: "Próximos 7 dias" },
  { value: "proximos_15", label: "Próximos 15 dias" },
  { value: "futuras", label: "Futuras" },
  { value: "sem_previsao", label: "Sem previsão" },
];

const quickFilters: { value: QuickFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "atencao", label: "Atenção" },
  { value: "risco", label: "Risco" },
  { value: "inativos", label: "Inativos antigos" },
  { value: "nao_trabalhados", label: "Não trabalhados" },
  { value: "convertidos", label: "Convertidos" },
  { value: "recompra", label: "Recompra" },
];

const levelValues: ClientLevel[] = ["saudavel", "atencao", "risco", "inativo"];

const statusValues: WorkStatus[] = [
  "nao_trabalhado",
  "contatado",
  "aguardando",
  "convertido",
  "visita",
];

const financialStatusValues: FinancialStatus[] = [
  "adimplente",
  "inadimplente",
  "bloqueado",
  "negociacao",
];

const nextPurchaseValues: NextPurchaseFilter[] = [
  "todas",
  "recompra",
  "proximos_7",
  "proximos_15",
  "futuras",
  "sem_previsao",
];

const quickFilterValues: QuickFilter[] = [
  "todos",
  "atencao",
  "risco",
  "inativos",
  "nao_trabalhados",
  "convertidos",
  "recompra",
];

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

const statusActionLabels: Record<ContactStatus, string> = {
  contatado: "Contato registrado",
  aguardando: "Aguardando retorno",
  convertido: "Conversão registrada",
  visita: "Visita encaminhada",
};

const channelLabels: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  email: "E-mail",
  presencial: "Presencial",
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function readLevelQuery(value: string | null): "todas" | ClientLevel {
  return value && levelValues.includes(value as ClientLevel)
    ? (value as ClientLevel)
    : "todas";
}

function readStatusQuery(value: string | null): "todos" | WorkStatus {
  return value && statusValues.includes(value as WorkStatus)
    ? (value as WorkStatus)
    : "todos";
}

function readFinancialQuery(value: string | null): "todas" | FinancialStatus {
  return value && financialStatusValues.includes(value as FinancialStatus)
    ? normalizeFinancialStatus(value)
    : "todas";
}

function readNextPurchaseQuery(value: string | null): NextPurchaseFilter {
  if (value === "vencidas") {
    return "recompra";
  }

  return value && nextPurchaseValues.includes(value as NextPurchaseFilter)
    ? (value as NextPurchaseFilter)
    : "todas";
}

function readQuickFilterQuery(value: string | null): QuickFilter {
  if (value === "vencidos") {
    return "recompra";
  }

  return value && quickFilterValues.includes(value as QuickFilter)
    ? (value as QuickFilter)
    : "todos";
}

function parseDate(date: string | null) {
  if (!date) {
    return null;
  }

  return new Date(`${date}T00:00:00.000Z`);
}

function dateTime(date: string | null) {
  return parseDate(date)?.getTime() ?? 0;
}

function formatDate(date: string | null) {
  const parsedDate = parseDate(date);

  if (!parsedDate) {
    return "-";
  }

  return dateFormatter.format(parsedDate);
}

function daysUntil(date: string | null) {
  const target = parseDate(date);
  const today = parseDate(TODAY);

  if (!target || !today) {
    return null;
  }

  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

function buildInteractionId() {
  return `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function matchesNextPurchase(
  client: CarteiraClient,
  filter: NextPurchaseFilter,
) {
  const diff = daysUntil(client.proximaCompra);

  if (filter === "todas") {
    return true;
  }

  if (filter === "sem_previsao") {
    return diff === null;
  }

  if (diff === null) {
    return false;
  }

  if (filter === "recompra") {
    return isClientInRecompra(client, TODAY);
  }

  if (filter === "proximos_7") {
    return diff >= 0 && diff <= 7;
  }

  if (filter === "proximos_15") {
    return diff >= 0 && diff <= 15;
  }

  return diff > 15;
}

function matchesQuickFilter(client: CarteiraClient, filter: QuickFilter) {
  switch (filter) {
    case "atencao":
      return matchesOperationalLevel(client, "atencao", TODAY);
    case "risco":
      return matchesOperationalLevel(client, "risco", TODAY);
    case "inativos":
      return matchesOperationalLevel(client, "inativo", TODAY);
    case "nao_trabalhados":
      return client.status === "nao_trabalhado";
    case "convertidos":
      return isClientConverted(client, TODAY);
    case "recompra":
      return isClientInRecompra(client, TODAY);
    default:
      return true;
  }
}

function getNextPurchaseLabel(client: CarteiraClient) {
  const diff = daysUntil(client.proximaCompra);

  if (diff === null) {
    return { label: "Sem previsão", tone: "muted" as const };
  }

  if (isClientConverted(client, TODAY)) {
    return { label: "Convertido", tone: "success" as const };
  }

  if (diff < 0) {
    return {
      label: `Recompra · ${formatDate(client.proximaCompra)}`,
      tone: "danger" as const,
    };
  }

  if (diff === 0) {
    return {
      label: `${formatDate(client.proximaCompra)} - hoje`,
      tone: "warning" as const,
    };
  }

  if (diff <= 7) {
    return {
      label: `${formatDate(client.proximaCompra)} - ${diff}d`,
      tone: "warning" as const,
    };
  }

  return { label: formatDate(client.proximaCompra), tone: "outline" as const };
}

function getRangeLabel(total: number, start: number, end: number) {
  if (total === 0) {
    return "0 registros";
  }

  return `${start + 1}-${end} de ${total}`;
}

function SortButton({
  children,
  sortKey,
  activeSortKey,
  direction,
  onSort,
  className,
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  activeSortKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = activeSortKey === sortKey;
  const SortIcon = isActive && direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex max-w-full items-center gap-1 text-[10px] leading-tight font-semibold text-muted-foreground uppercase hover:text-foreground xl:text-xs",
        className,
      )}
      onClick={() => onSort(sortKey)}
    >
      {children}
      <SortIcon
        className={cn("h-3.5 w-3.5", !isActive && "opacity-35")}
        aria-hidden="true"
      />
    </button>
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
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="sr-only">{label}</span>
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

function CarteiraSourceNotice({ state }: { state: CarteiraSourceState }) {
  if (state.status === "loading") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Carregando carteira publicada no Supabase...
      </div>
    );
  }

  if (state.status === "supabase") {
    return (
      <div className="mb-4 rounded-lg border border-success bg-success px-3 py-2 text-sm text-success-foreground shadow-sm">
        Carteira carregada do Supabase
        {state.importacao ? (
          <>
            {" "}
            · {state.importacao.arquivo} · {state.importacao.totalClientes}{" "}
            clientes
          </>
        ) : null}
        .
      </div>
    );
  }

  const fallbackMessage =
    state.message ??
    "A Carteira está usando a base local/mock até existir uma importação publicada no Supabase.";

  return (
    <div
      className={cn(
        "mb-4 rounded-lg border px-3 py-2 text-sm shadow-sm",
        state.status === "error"
          ? "border-danger-soft bg-danger-soft text-danger-soft-foreground"
          : "border-warning bg-warning text-warning-foreground",
      )}
    >
      {fallbackMessage}
    </div>
  );
}

function ClientActions({
  client,
  onRegisterContact,
}: {
  client: CarteiraClient;
  onRegisterContact: (client: CarteiraClient) => void;
}) {
  return (
    <div className="flex justify-end gap-0.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 md:h-7 md:w-7 xl:h-8 xl:w-8"
        title="Registrar contato"
        aria-label={`Registrar contato de ${client.cliente}`}
        onClick={() => onRegisterContact(client)}
      >
        <PhoneCall className="h-4 w-4" />
      </Button>
      <Button
        asChild
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 md:h-7 md:w-7 xl:h-8 xl:w-8"
        title="WhatsApp"
      >
        <a
          href={`https://wa.me/55${phoneDigits(client.telefone)}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`Abrir WhatsApp de ${client.cliente}`}
        >
          <MessageCircle className="h-4 w-4" />
        </a>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 md:h-7 md:w-7 xl:h-8 xl:w-8"
        title="Agendar follow-up"
        aria-label={`Agendar follow-up para ${client.cliente}`}
      >
        <CalendarPlus className="h-4 w-4" />
      </Button>
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 md:h-7 md:w-7 xl:h-8 xl:w-8"
        title="Ver detalhe"
      >
        <Link
          href={`/clientes/${client.id}`}
          aria-label={`Ver detalhe de ${client.cliente}`}
        >
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function CarteiraColumnHeader({
  columnId,
  sortKey,
  sortDirection,
  onSort,
}: {
  columnId: CarteiraColumnId;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  if (columnId === "diasSemComprar") {
    return (
      <SortButton
        sortKey="diasSemComprar"
        activeSortKey={sortKey}
        direction={sortDirection}
        onSort={onSort}
        className="justify-end text-right"
      >
        Dias sem comprar
      </SortButton>
    );
  }

  if (columnId === "ultimoPedido") {
    return (
      <SortButton
        sortKey="ultimoPedido"
        activeSortKey={sortKey}
        direction={sortDirection}
        onSort={onSort}
      >
        Último pedido
      </SortButton>
    );
  }

  return carteiraColumns.find((column) => column.id === columnId)?.label ?? "";
}

function CarteiraColumnCell({
  client,
  columnId,
}: {
  client: CarteiraClient;
  columnId: CarteiraColumnId;
}) {
  const nextPurchase = getNextPurchaseLabel(client);
  const operationalLevel = getOperationalClientLevel(client, TODAY);

  switch (columnId) {
    case "nivel":
      return isClientConverted(client, TODAY) || !operationalLevel ? (
        <StatusBadge status="convertido" />
      ) : (
        <StatusBadge status={operationalLevel} />
      );
    case "cliente":
      return (
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground" title={client.cliente}>
            {client.cliente}
          </div>
          {client.nomeFantasia && client.nomeFantasia !== client.cliente ? (
            <div className="truncate text-xs text-muted-foreground">
              {client.nomeFantasia}
            </div>
          ) : null}
        </div>
      );
    case "telefone":
      return (
        <a
          href={`tel:${phoneDigits(client.telefone)}`}
          className="whitespace-nowrap text-sm text-foreground hover:text-primary"
        >
          {client.telefone}
        </a>
      );
    case "cidade":
      return (
        <div className="min-w-0">
          <div className="truncate text-sm" title={client.cidade}>
            {client.cidade}
          </div>
          <div className="truncate text-xs text-muted-foreground" title={client.bairro}>
            {client.bairro}
          </div>
        </div>
      );
    case "cep":
      return <span className="whitespace-nowrap">{client.cep ?? "-"}</span>;
    case "endereco":
      return (
        <div className="truncate text-sm" title={client.endereco ?? ""}>
          {client.endereco ?? "-"}
        </div>
      );
    case "diasSemComprar":
      return (
        <span
          className={cn(
            "font-mono text-sm font-semibold",
            operationalLevel === "risco" && "text-danger-soft-foreground",
            operationalLevel === "atencao" &&
              "text-warning-foreground",
          )}
        >
          {client.diasSemComprar}
        </span>
      );
    case "proximaCompra":
      return <Badge variant={nextPurchase.tone}>{nextPurchase.label}</Badge>;
    case "ultimoPedido":
      return (
        <>
          <div className="whitespace-nowrap text-sm">
            {formatDate(client.ultimoPedido)}
          </div>
          <div className="text-xs text-muted-foreground">
            {currencyFormatter.format(client.valorUltimoPedido)}
          </div>
        </>
      );
    case "vendedor":
      return (
        <div className="truncate text-sm" title={client.vendedor}>
          {client.vendedor}
        </div>
      );
    case "situacaoFinanceira":
      return <StatusBadge status={getClientFinancialStatus(client)} />;
    case "status":
      return <StatusBadge status={client.status} />;
    case "ultimaAcao":
      return (
        <div className="min-w-0">
          <div className="truncate text-sm" title={client.ultimaAcao.tipo}>
            {client.ultimaAcao.tipo}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(client.ultimaAcao.data)}
          </div>
        </div>
      );
  }
}

function MobileField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 min-w-0 text-sm text-foreground">{children}</div>
    </div>
  );
}

function CarteiraMobileList({
  clients,
  visibleColumns,
  onRegisterContact,
}: {
  clients: CarteiraClient[];
  visibleColumns: ReadonlySet<CarteiraColumnId>;
  onRegisterContact: (client: CarteiraClient) => void;
}) {
  return (
    <div className="space-y-2 md:hidden">
      {clients.map((client) => {
        const nextPurchase = getNextPurchaseLabel(client);
        const operationalLevel = getOperationalClientLevel(client, TODAY);

        return (
          <article
            key={client.id}
            className="rounded-lg border bg-card p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/clientes/${client.id}`}
                  className="block truncate font-semibold text-foreground hover:text-primary"
                >
                  {client.cliente}
                </Link>
                {visibleColumns.has("cidade") ? (
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {client.cidade} · {client.bairro}
                  </div>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-lg font-semibold">
                  {client.diasSemComprar}
                </div>
                <div className="text-[10px] uppercase text-muted-foreground">
                  dias
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              {visibleColumns.has("nivel") ? (
                <MobileField label="Nível">
                  {isClientConverted(client, TODAY) || !operationalLevel ? (
                    <StatusBadge status="convertido" />
                  ) : (
                    <StatusBadge status={operationalLevel} />
                  )}
                </MobileField>
              ) : null}
              {visibleColumns.has("status") ? (
                <MobileField label="Status">
                  <StatusBadge status={client.status} />
                </MobileField>
              ) : null}
              {visibleColumns.has("situacaoFinanceira") ? (
                <MobileField label="Financeiro">
                  <StatusBadge status={getClientFinancialStatus(client)} />
                </MobileField>
              ) : null}
              {visibleColumns.has("telefone") ? (
                <MobileField label="Telefone">
                  <a href={`tel:${phoneDigits(client.telefone)}`}>
                    {client.telefone}
                  </a>
                </MobileField>
              ) : null}
              {visibleColumns.has("proximaCompra") ? (
                <MobileField label="Próxima compra">
                  <Badge variant={nextPurchase.tone}>{nextPurchase.label}</Badge>
                </MobileField>
              ) : null}
              {visibleColumns.has("ultimoPedido") ? (
                <MobileField label="Último pedido">
                  {formatDate(client.ultimoPedido)}
                </MobileField>
              ) : null}
              {visibleColumns.has("vendedor") ? (
                <MobileField label="Vendedor">
                  <span className="block truncate">{client.vendedor}</span>
                </MobileField>
              ) : null}
              {visibleColumns.has("cep") ? (
                <MobileField label="CEP">{client.cep ?? "-"}</MobileField>
              ) : null}
              {visibleColumns.has("endereco") ? (
                <MobileField label="Endereço">
                  <span className="block truncate">{client.endereco ?? "-"}</span>
                </MobileField>
              ) : null}
              {visibleColumns.has("ultimaAcao") ? (
                <MobileField label="Última ação">
                  <span className="block truncate">{client.ultimaAcao.tipo}</span>
                </MobileField>
              ) : null}
            </div>

            <div className="mt-3 border-t pt-3">
              <ClientActions
                client={client}
                onRegisterContact={onRegisterContact}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function CarteiraTable({
  clients,
  visibleColumns,
  sortKey,
  sortDirection,
  onSort,
  onRegisterContact,
}: {
  clients: CarteiraClient[];
  visibleColumns: CarteiraColumnId[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  onRegisterContact: (client: CarteiraClient) => void;
}) {
  const visibleColumnSet = new Set(visibleColumns);
  const tableMinWidth =
    visibleColumns.length > 7
      ? visibleColumns.reduce(
          (total, columnId) => total + carteiraColumnWidths[columnId],
          0,
        ) + 160
      : undefined;

  return (
    <>
      <CarteiraMobileList
        clients={clients}
        visibleColumns={visibleColumnSet}
        onRegisterContact={onRegisterContact}
      />

      <div className="hidden overflow-hidden rounded-lg border bg-card shadow-sm md:block">
        <Table
          className="table-fixed table-density-compact"
          style={
            tableMinWidth ? { minWidth: `${tableMinWidth}px` } : undefined
          }
        >
          <TableHeader className="sticky top-0 z-10">
            <TableRow>
              {visibleColumns.map((columnId) => (
                <TableHead
                  key={columnId}
                  className={cn(
                    "overflow-hidden text-[10px] leading-tight [overflow-wrap:anywhere] xl:text-xs",
                    columnId === "diasSemComprar" && "text-right",
                  )}
                  style={
                    tableMinWidth
                      ? { width: `${carteiraColumnWidths[columnId]}px` }
                      : undefined
                  }
                >
                  <CarteiraColumnHeader
                    columnId={columnId}
                    sortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={onSort}
                  />
                </TableHead>
              ))}
              <TableHead className="w-[144px] text-right xl:w-[160px]">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                {visibleColumns.map((columnId) => (
                  <TableCell
                    key={columnId}
                    className={cn(
                      "overflow-hidden",
                      columnId === "diasSemComprar" && "text-right",
                    )}
                  >
                    <CarteiraColumnCell client={client} columnId={columnId} />
                  </TableCell>
                ))}
                <TableCell>
                  <ClientActions
                    client={client}
                    onRegisterContact={onRegisterContact}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export function CarteiraView() {
  const searchParams = useSearchParams();
  const auth = useAuthContext();
  const { awardInteractionPoints } = useGamification();
  const [clients, setClients] = useState<CarteiraClient[]>(
    getCarteiraClientsWithPublishedImports,
  );
  const [interactions, setInteractions] = useState<CarteiraInteraction[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [search, setSearch] = useState(() => searchParams.get("busca") ?? "");
  const [vendor, setVendor] = useState(
    () => searchParams.get("vendedor") ?? "todos",
  );
  const [city, setCity] = useState(() => searchParams.get("cidade") ?? "todas");
  const [level, setLevel] = useState<"todas" | ClientLevel>(() =>
    readLevelQuery(searchParams.get("classificacao")),
  );
  const [status, setStatus] = useState<"todos" | WorkStatus>(() =>
    readStatusQuery(searchParams.get("status")),
  );
  const [financialStatus, setFinancialStatus] = useState<
    "todas" | FinancialStatus
  >(() => readFinancialQuery(searchParams.get("financeiro")));
  const [nextPurchase, setNextPurchase] =
    useState<NextPurchaseFilter>(() =>
      readNextPurchaseQuery(searchParams.get("proxima")),
    );
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(() =>
    readQuickFilterQuery(searchParams.get("quick")),
  );
  const [sortKey, setSortKey] = useState<SortKey>("diasSemComprar");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [sourceState, setSourceState] = useState<CarteiraSourceState>({
    status: "loading",
    message: null,
    importacao: null,
  });
  const [persistenceToasts, setPersistenceToasts] = useState<
    PersistenceToast[]
  >([]);
  const columnPreferences = useTableColumnPreferences({
    storageKey: CARTEIRA_COLUMNS_STORAGE_KEY,
    userScope: auth.profile?.id,
    columns: carteiraColumns,
    presets: carteiraColumnPresets,
    defaultPresetId: "operacional",
  });

  useEffect(() => {
    let isMounted = true;

    loadCarteiraFromSupabaseAction()
      .then((result) => {
        if (!isMounted) {
          return;
        }

        if (result.status === "available") {
          setClients(result.clients);
          saveSupabaseCarteiraSnapshot(result.clients);
          setSourceState({
            status: "supabase",
            message: result.message ?? null,
            importacao: result.importacao,
          });
          return;
        }

        setSourceState({
          status:
            result.status === "empty"
              ? "empty"
              : result.status === "error"
                ? "error"
                : "fallback",
          message: result.message ?? null,
          importacao: result.importacao,
        });
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setSourceState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível carregar a Carteira no Supabase. A base local/mock foi mantida.",
          importacao: null,
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const vendorOptions = useMemo(
    () => [
      { value: "todos", label: "Todos os vendedores" },
      ...Array.from(new Set(clients.map((client) => client.vendedor)))
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .map((item) => ({ value: item, label: item })),
    ],
    [clients],
  );

  const cityOptions = useMemo(
    () => [
      { value: "todas", label: "Todas as cidades" },
      ...Array.from(new Set(clients.map((client) => client.cidade)))
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .map((item) => ({ value: item, label: item })),
    ],
    [clients],
  );

  const baseFilteredClients = useMemo(() => {
    const normalizedSearch = normalizeText(search.trim());

    return clients.filter((client) => {
      const haystack = normalizeText(
        `${client.cliente} ${client.nomeFantasia ?? ""} ${client.telefone} ${client.cidade} ${client.bairro}`,
      );

      return (
        (!normalizedSearch || haystack.includes(normalizedSearch)) &&
        (vendor === "todos" || client.vendedor === vendor) &&
        (city === "todas" || client.cidade === city) &&
        (level === "todas" || matchesOperationalLevel(client, level, TODAY)) &&
        (status === "todos" ||
          (status === "convertido"
            ? isClientConverted(client, TODAY)
            : client.status === status)) &&
        (financialStatus === "todas" ||
          getClientFinancialStatus(client) === financialStatus) &&
        matchesNextPurchase(client, nextPurchase)
      );
    });
  }, [
    city,
    clients,
    financialStatus,
    level,
    nextPurchase,
    search,
    status,
    vendor,
  ]);

  const quickCounts = useMemo(() => {
    return quickFilters.reduce<Record<QuickFilter, number>>(
      (counts, filter) => {
        counts[filter.value] = baseFilteredClients.filter((client) =>
          matchesQuickFilter(client, filter.value),
        ).length;

        return counts;
      },
      {
        todos: 0,
        atencao: 0,
        risco: 0,
        inativos: 0,
        nao_trabalhados: 0,
        convertidos: 0,
        recompra: 0,
      },
    );
  }, [baseFilteredClients]);

  const sortedClients = useMemo(() => {
    return [...baseFilteredClients.filter((client) =>
      matchesQuickFilter(client, quickFilter),
    )].sort((first, second) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "ultimoPedido") {
        return (
          (dateTime(first.ultimoPedido) - dateTime(second.ultimoPedido)) *
          direction
        );
      }

      return (first.diasSemComprar - second.diasSemComprar) * direction;
    });
  }, [baseFilteredClients, quickFilter, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedClients.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, sortedClients.length);
  const pageClients = sortedClients.slice(pageStart, pageEnd);
  const selectedClient = selectedClientId
    ? clients.find((client) => client.id === selectedClientId) ?? null
    : null;

  const summary = useMemo(
    () => ({
      total: clients.length,
      visible: sortedClients.length,
      risk: clients.filter((client) =>
        matchesOperationalLevel(client, "risco", TODAY),
      ).length,
      recompra: clients.filter((client) => isClientInRecompra(client, TODAY))
        .length,
    }),
    [clients, sortedClients.length],
  );

  function handleSort(key: SortKey) {
    setCurrentPage(1);

    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("desc");
  }

  function resetFilters() {
    setSearch("");
    setVendor("todos");
    setCity("todas");
    setLevel("todas");
    setStatus("todos");
    setFinancialStatus("todas");
    setNextPurchase("todas");
    setQuickFilter("todos");
    setSortKey("diasSemComprar");
    setSortDirection("desc");
    setPageSize(DEFAULT_PAGE_SIZE);
    setCurrentPage(1);
  }

  function dismissPersistenceToast(id: string) {
    setPersistenceToasts((current) =>
      current.filter((toast) => toast.id !== id),
    );
  }

  function showPersistenceToast(result: SaveInteractionSupabaseResult) {
    const toast = buildPersistenceToast(result);

    setPersistenceToasts((current) => [toast, ...current].slice(0, 3));
    window.setTimeout(() => dismissPersistenceToast(toast.id), 4200);
  }

  function handleSaveInteraction(interactionInput: CarteiraInteractionInput) {
    const createdAt = new Date().toISOString();
    const sourceClient = clients.find(
      (client) => client.id === interactionInput.clienteId,
    );
    const interaction: CarteiraInteraction = {
      ...interactionInput,
      id: buildInteractionId(),
      criadoEm: createdAt,
    };
    const lastActionLabel = `${statusActionLabels[interaction.status]} via ${
      channelLabels[interaction.canal]
    }`;
    const pointEvents = sourceClient
      ? awardInteractionPoints({
          client: sourceClient,
          interaction,
          createdAt,
        })
      : [];

    if (sourceClient) {
      saveInteractionToSupabaseAction({
        interaction,
        client: sourceClient,
        pointEvents,
        lastActionLabel,
      })
        .then(showPersistenceToast)
        .catch((error: unknown) => {
          showPersistenceToast({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Nao foi possivel salvar a interacao no Supabase.",
          });
        });
    }

    setInteractions((current) => [interaction, ...current]);
    setClients((currentClients) =>
      currentClients.map((client) => {
        if (client.id !== interaction.clienteId) {
          return client;
        }

        const updatedClient = {
          ...client,
          status: interaction.status,
          ultimaAcao: {
            tipo: lastActionLabel,
            data: createdAt.slice(0, 10),
          },
          interacoes: [interaction, ...(client.interacoes ?? [])],
        };

        persistImportedClientUpdate(updatedClient);

        return updatedClient;
      }),
    );
    setSelectedClientId(null);
  }

  return (
    <>
      <PageHeader
        eyebrow="Operação comercial"
        title="Carteira"
        description="Lista operacional para priorizar clientes, acionar contatos e acompanhar retorno da base."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Novo cliente
            </Button>
          </>
        }
      />

      <CarteiraSourceNotice state={sourceState} />

      <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Clientes na base</div>
            <div className="mt-1 text-xl font-semibold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Na seleção</div>
            <div className="mt-1 text-xl font-semibold">{summary.visible}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Em risco</div>
            <div className="mt-1 text-xl font-semibold text-danger-soft-foreground">
              {summary.risk}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Recompra</div>
            <div className="mt-1 text-xl font-semibold text-warning-foreground">
              {summary.recompra}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="mb-4">
        <CardContent className="space-y-3 p-3">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(260px,1fr)_repeat(5,minmax(150px,180px))]">
            <SearchInput
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por nome, telefone, cidade ou bairro"
              icon={<Search className="h-4 w-4" />}
            />
            <SelectFilter
              label="Vendedor"
              value={vendor}
              options={vendorOptions}
              onChange={(value) => {
                setVendor(value);
                setCurrentPage(1);
              }}
            />
            <SelectFilter
              label="Cidade"
              value={city}
              options={cityOptions}
              onChange={(value) => {
                setCity(value);
                setCurrentPage(1);
              }}
            />
            <SelectFilter
              label="Classificação"
              value={level}
              options={levelOptions}
              onChange={(value) => {
                setLevel(value as "todas" | ClientLevel);
                setCurrentPage(1);
              }}
            />
            <SelectFilter
              label="Status"
              value={status}
              options={statusOptions}
              onChange={(value) => {
                setStatus(value as "todos" | WorkStatus);
                setCurrentPage(1);
              }}
            />
            <SelectFilter
              label="Situação financeira"
              value={financialStatus}
              options={financialStatusFilterOptions}
              onChange={(value) => {
                setFinancialStatus(value as "todas" | FinancialStatus);
                setCurrentPage(1);
              }}
            />
            <SelectFilter
              label="Próxima compra"
              value={nextPurchase}
              options={nextPurchaseOptions}
              onChange={(value) => {
                setNextPurchase(value as NextPurchaseFilter);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  variant={quickFilter === filter.value ? "subtle" : "outline"}
                  size="sm"
                  onClick={() => {
                    setQuickFilter(filter.value);
                    setCurrentPage(1);
                  }}
                >
                  {filter.label}
                  <span className="rounded bg-card/70 px-1.5 py-0.5 font-mono text-[11px]">
                    {quickCounts[filter.value]}
                  </span>
                </Button>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start lg:self-auto"
              onClick={resetFilters}
            >
              <RotateCcw className="h-4 w-4" />
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {pageClients.length > 0 ? (
        <>
          <div className="mb-2 flex flex-col gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">
                {pageClients.length} clientes nesta página
              </div>
              <div className="text-xs text-muted-foreground">
                Visão{" "}
                {carteiraColumnPresets.find(
                  (preset) => preset.id === columnPreferences.activePresetId,
                )?.label.toLowerCase() ?? "personalizada"}
              </div>
            </div>
            <ColumnVisibilityMenu
              columns={carteiraColumns}
              presets={carteiraColumnPresets}
              visibleColumns={columnPreferences.visibleColumnSet}
              activePresetId={columnPreferences.activePresetId}
              onToggle={columnPreferences.toggleColumn}
              onPresetChange={columnPreferences.applyPreset}
            />
          </div>

          <CarteiraTable
            clients={pageClients}
            visibleColumns={columnPreferences.visibleColumns}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={handleSort}
            onRegisterContact={(client) => setSelectedClientId(client.id)}
          />

          <div className="mt-3 flex flex-col gap-3 rounded-lg border bg-card px-3 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted-foreground">
              {getRangeLabel(sortedClients.length, pageStart, pageEnd)}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <label className="flex items-center gap-2 text-muted-foreground">
                Linhas
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                >
                  {[10, 15, 20].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <div className="font-mono text-xs text-muted-foreground">
                {safePage}/{totalPages}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={safePage === totalPages}
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          title="Nenhum cliente encontrado"
          description="Ajuste os filtros ou limpe a busca para voltar a exibir a carteira."
        />
      )}

      {selectedClient ? (
        <InteractionDrawer
          key={selectedClient.id}
          client={selectedClient}
          interactions={interactions}
          onClose={() => setSelectedClientId(null)}
          onSave={handleSaveInteraction}
        />
      ) : null}

      <InteractionPersistenceToastStack
        toasts={persistenceToasts}
        onDismiss={dismissPersistenceToast}
      />
    </>
  );
}
