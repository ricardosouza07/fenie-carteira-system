"use client";

import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  PhoneCall,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { completeCalendarFollowUpAction, rescheduleCalendarFollowUpAction } from "@/features/calendario/actions";
import { saveInteractionToSupabaseAction } from "@/features/carteira/actions";
import {
  getCarteiraClientsWithPublishedImports,
  persistImportedClientUpdate,
  saveSupabaseCarteiraSnapshot,
} from "@/features/carteira/client-store";
import { InteractionDrawer } from "@/features/carteira/interaction-drawer";
import {
  buildPersistenceToast,
  InteractionPersistenceToastStack,
  type PersistenceToast,
} from "@/features/carteira/interaction-persistence-toast";
import type {
  CarteiraClient,
  CarteiraInteraction,
  CarteiraInteractionInput,
  ContactChannel,
  ContactStatus,
  WorkStatus,
} from "@/features/carteira/types";
import { useGamification } from "@/features/gamification/gamification-provider";
import { cn } from "@/lib/utils";

import type {
  CalendarEvent,
  CalendarEventType,
  CalendarViewMode,
  EventTypeFilter,
  LoadCalendarioResult,
} from "./types";

const TODAY = "2026-05-27";
const INITIAL_MONTH = "2026-05";
const INITIAL_SELECTED_DATE = "2026-05-27";

type StatusFilter =
  | "todos"
  | WorkStatus
  | "aberto"
  | "vencido"
  | "concluido";

type DayCell = {
  date: string;
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
};

type SelectOption = {
  value: string;
  label: string;
};

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const eventTypeOptions: SelectOption[] = [
  { value: "todos", label: "Todos os tipos" },
  { value: "proxima_compra", label: "Proxima compra" },
  { value: "follow_up", label: "Follow-up" },
  { value: "visita", label: "Visita" },
  { value: "vencido", label: "Vencido" },
  { value: "convertido", label: "Convertido" },
];

const statusOptions: SelectOption[] = [
  { value: "todos", label: "Todos os status" },
  { value: "nao_trabalhado", label: "Nao trabalhado" },
  { value: "contatado", label: "Contatado" },
  { value: "aguardando", label: "Aguardando retorno" },
  { value: "convertido", label: "Convertido" },
  { value: "visita", label: "Visita encaminhada" },
  { value: "aberto", label: "Follow-up aberto" },
  { value: "vencido", label: "Vencido" },
  { value: "concluido", label: "Concluido" },
];

const eventTypeConfig: Record<
  CalendarEventType,
  {
    label: string;
    dot: string;
    badge: ComponentProps<typeof Badge>["variant"];
    chip: string;
  }
> = {
  proxima_compra: {
    label: "Proxima compra",
    dot: "bg-info-foreground",
    badge: "info",
    chip: "border-info/70 bg-info text-info-foreground",
  },
  follow_up: {
    label: "Follow-up",
    dot: "bg-primary",
    badge: "outline",
    chip: "border-primary/30 bg-accent text-accent-foreground",
  },
  visita: {
    label: "Visita",
    dot: "bg-warning-foreground",
    badge: "warning",
    chip: "border-warning/70 bg-warning text-warning-foreground",
  },
  vencido: {
    label: "Vencido",
    dot: "bg-danger-soft-foreground",
    badge: "danger",
    chip: "border-danger-soft bg-danger-soft text-danger-soft-foreground",
  },
  convertido: {
    label: "Convertido",
    dot: "bg-success-foreground",
    badge: "success",
    chip: "border-success bg-success text-success-foreground",
  },
};

const statusActionLabels: Record<ContactStatus, string> = {
  contatado: "Contato registrado",
  aguardando: "Aguardando retorno",
  convertido: "Conversao registrada",
  visita: "Visita encaminhada",
};

const channelLabels: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  email: "E-mail",
  presencial: "Presencial",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function parseDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const current = parseDate(date);
  current.setUTCDate(current.getUTCDate() + days);

  return toDateKey(current);
}

function addMonths(month: string, months: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthIndex - 1 + months, 1));

  return toDateKey(date).slice(0, 7);
}

function getMonthLabel(month: string) {
  const label = monthFormatter.format(parseDate(`${month}-01`));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getDateLabel(date: string) {
  return dateFormatter.format(parseDate(date));
}

function getWeekStart(date: string) {
  const parsedDate = parseDate(date);
  const day = parsedDate.getUTCDay();

  return addDays(date, -day);
}

function buildMonthCells(month: string, selectedDate: string): DayCell[] {
  const firstDay = `${month}-01`;
  const firstWeekDay = parseDate(firstDay).getUTCDay();
  const startDate = addDays(firstDay, -firstWeekDay);

  return Array.from({ length: 42 }).map((_, index) => {
    const date = addDays(startDate, index);

    return {
      date,
      day: parseDate(date).getUTCDate(),
      inCurrentMonth: date.startsWith(month),
      isToday: date === TODAY,
      isSelected: date === selectedDate,
    };
  });
}

function buildWeekCells(selectedDate: string): DayCell[] {
  const startDate = getWeekStart(selectedDate);

  return Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(startDate, index);

    return {
      date,
      day: parseDate(date).getUTCDate(),
      inCurrentMonth: true,
      isToday: date === TODAY,
      isSelected: date === selectedDate,
    };
  });
}

function buildInteractionId() {
  return `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveDate(
  eventId: string,
  fallbackDate: string,
  reschedules: Record<string, string>,
) {
  return reschedules[eventId] ?? fallbackDate;
}

function customerHref(client: CarteiraClient) {
  return `/clientes/${client.id}`;
}

function getEventTitle(type: CalendarEventType) {
  return eventTypeConfig[type].label;
}

function localBaseEventType(client: CarteiraClient): CalendarEventType {
  if (client.status === "visita") {
    return "visita";
  }

  if (client.proximaCompra && client.proximaCompra < TODAY) {
    return "vencido";
  }

  if (client.status === "aguardando" || client.status === "contatado") {
    return "follow_up";
  }

  return "proxima_compra";
}

function applyRuntimeState(
  event: CalendarEvent,
  reschedules: Record<string, string>,
  completedEventIds: Set<string>,
): CalendarEvent {
  const date = resolveDate(event.id, event.date, reschedules);
  const isCompleted = completedEventIds.has(event.id);

  if (isCompleted) {
    return {
      ...event,
      date,
      type: "follow_up",
      title: getEventTitle("follow_up"),
      statusLabel: "Concluido",
      canReschedule: false,
      canComplete: false,
    };
  }

  if (event.source === "follow_up") {
    const type = date < TODAY ? "vencido" : "follow_up";

    return {
      ...event,
      date,
      type,
      title: getEventTitle(type),
      statusLabel: type === "vencido" ? "Vencido" : event.statusLabel,
    };
  }

  if (
    (event.source === "proxima_compra" || event.source === "status") &&
    event.type !== "visita" &&
    event.type !== "convertido"
  ) {
    const type = date < TODAY ? "vencido" : event.type;

    return {
      ...event,
      date,
      type,
      title: getEventTitle(type),
    };
  }

  return {
    ...event,
    date,
  };
}

function sortEvents(events: CalendarEvent[]) {
  return [...events].sort((first, second) => {
    if (first.date === second.date) {
      return first.client.cliente.localeCompare(second.client.cliente, "pt-BR");
    }

    return first.date.localeCompare(second.date);
  });
}

function buildSessionInteractionEvents({
  clients,
  interactions,
  reschedules,
}: {
  clients: CarteiraClient[];
  interactions: CarteiraInteraction[];
  reschedules: Record<string, string>;
}) {
  return interactions.flatMap<CalendarEvent>((interaction) => {
    if (!interaction.proximoFollowUp) {
      return [];
    }

    const client = clients.find((item) => item.id === interaction.clienteId);

    if (!client) {
      return [];
    }

    const fallbackType =
      interaction.status === "visita" ? "visita" : "follow_up";
    const eventId = `session-interaction-${interaction.id}`;
    const date = resolveDate(eventId, interaction.proximoFollowUp, reschedules);
    const type =
      date < TODAY && fallbackType !== "visita" ? "vencido" : fallbackType;

    return [
      {
        id: eventId,
        type,
        source: "follow_up",
        date,
        client,
        customerHref: customerHref(client),
        title: getEventTitle(type),
        description: interaction.observacao ?? "Follow-up criado na sessao",
        statusLabel: type === "vencido" ? "Vencido" : "Aberto",
        canReschedule: true,
        canComplete: true,
      },
    ];
  });
}

function buildLocalCalendarEvents({
  clients,
  interactions,
  reschedules,
}: {
  clients: CarteiraClient[];
  interactions: CarteiraInteraction[];
  reschedules: Record<string, string>;
}) {
  const events: CalendarEvent[] = [];

  clients.forEach((client) => {
    if (client.proximaCompra) {
      const baseType = localBaseEventType(client);
      const eventId = `local-${baseType}-${client.id}`;
      const date = resolveDate(eventId, client.proximaCompra, reschedules);
      const type = date < TODAY && baseType !== "visita" ? "vencido" : baseType;

      events.push({
        id: eventId,
        type,
        source: baseType === "follow_up" ? "status" : "proxima_compra",
        date,
        client,
        customerHref: customerHref(client),
        title: getEventTitle(type),
        description:
          baseType === "visita"
            ? "Visita comercial encaminhada"
            : "Proxima compra ou retorno previsto",
        statusLabel: type === "vencido" ? "Vencido" : "Previsto",
        canReschedule: false,
        canComplete: false,
      });
    }

    if (client.status === "convertido" && client.ultimaAcao.data) {
      const eventId = `local-converted-${client.id}`;
      const date = resolveDate(eventId, client.ultimaAcao.data, reschedules);

      events.push({
        id: eventId,
        type: "convertido",
        source: "interaction",
        date,
        client,
        customerHref: customerHref(client),
        title: "Convertido",
        description: "Pedido recuperado no periodo",
        statusLabel: "Convertido",
        canReschedule: false,
        canComplete: false,
      });
    }
  });

  return sortEvents([
    ...events,
    ...buildSessionInteractionEvents({ clients, interactions, reschedules }),
  ]);
}

function eventMatchesStatus(event: CalendarEvent, status: StatusFilter) {
  if (status === "todos") {
    return true;
  }

  if (status === "aberto") {
    return event.statusLabel.toLowerCase() === "aberto";
  }

  if (status === "concluido") {
    return event.statusLabel.toLowerCase() === "concluido";
  }

  if (status === "vencido") {
    return event.type === "vencido" || event.statusLabel.toLowerCase() === "vencido";
  }

  return event.client.status === status;
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

function EventPill({ event }: { event: CalendarEvent }) {
  const config = eventTypeConfig[event.type];

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1 rounded border px-1.5 py-1 text-[11px]",
        config.chip,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", config.dot)} />
      <span className="truncate">{event.client.cliente}</span>
    </div>
  );
}

function CalendarGrid({
  days,
  eventsByDate,
  viewMode,
  onSelectDate,
}: {
  days: DayCell[];
  eventsByDate: Map<string, CalendarEvent[]>;
  viewMode: CalendarViewMode;
  onSelectDate: (date: string) => void;
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="p-3">
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day) => (
            <div
              key={day}
              className="rounded-md bg-muted px-1.5 py-2 text-center text-[11px] font-semibold uppercase text-muted-foreground sm:text-xs"
            >
              {day}
            </div>
          ))}
          {days.map((day) => {
            const dayEvents = eventsByDate.get(day.date) ?? [];
            const visibleEvents = dayEvents.slice(0, viewMode === "mes" ? 3 : 6);
            const hiddenCount = dayEvents.length - visibleEvents.length;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => onSelectDate(day.date)}
                className={cn(
                  "min-w-0 rounded-md border bg-card p-1.5 text-left transition hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  viewMode === "mes"
                    ? "min-h-[92px] sm:min-h-[128px]"
                    : "min-h-[164px]",
                  !day.inCurrentMonth && "bg-muted/30 text-muted-foreground",
                  day.isSelected && "border-primary bg-accent/45",
                )}
                aria-label={`Selecionar ${getDateLabel(day.date)}`}
              >
                <div className="mb-1 flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold",
                      day.isToday && "bg-primary text-primary-foreground",
                    )}
                  >
                    {day.day}
                  </span>
                  {dayEvents.length ? (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {dayEvents.length}
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1 overflow-hidden">
                  {visibleEvents.map((event) => (
                    <EventPill key={event.id} event={event} />
                  ))}
                  {hiddenCount > 0 ? (
                    <div className="px-1 text-[11px] text-muted-foreground">
                      +{hiddenCount} eventos
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function EventActions({
  event,
  reschedulingId,
  completingId,
  rescheduleDraft,
  onRegisterContact,
  onStartReschedule,
  onCancelReschedule,
  onChangeReschedule,
  onSaveReschedule,
  onCompleteFollowUp,
}: {
  event: CalendarEvent;
  reschedulingId: string | null;
  completingId: string | null;
  rescheduleDraft: string;
  onRegisterContact: (client: CarteiraClient) => void;
  onStartReschedule: (event: CalendarEvent) => void;
  onCancelReschedule: () => void;
  onChangeReschedule: (date: string) => void;
  onSaveReschedule: (event: CalendarEvent) => void;
  onCompleteFollowUp: (event: CalendarEvent) => void;
}) {
  const isRescheduling = reschedulingId === event.id;
  const isCompleting = completingId === event.id;

  if (isRescheduling) {
    return (
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input
          type="date"
          value={rescheduleDraft}
          onChange={(event) => onChangeReschedule(event.target.value)}
          aria-label="Nova data"
        />
        <Button type="button" size="sm" onClick={() => onSaveReschedule(event)}>
          <Save className="h-4 w-4" />
          Salvar
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancelReschedule}>
          <X className="h-4 w-4" />
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={event.customerHref}>
          <Eye className="h-4 w-4" />
          Ver cliente
        </Link>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onRegisterContact(event.client)}
      >
        <PhoneCall className="h-4 w-4" />
        Registrar contato
      </Button>
      {event.canReschedule ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onStartReschedule(event)}
        >
          <RefreshCw className="h-4 w-4" />
          Reagendar
        </Button>
      ) : null}
      {event.canComplete ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onCompleteFollowUp(event)}
          disabled={isCompleting}
        >
          <CheckCircle2 className="h-4 w-4" />
          {isCompleting ? "Concluindo" : "Concluir"}
        </Button>
      ) : null}
    </div>
  );
}

function DayEventsPanel({
  selectedDate,
  events,
  reschedulingId,
  completingId,
  rescheduleDraft,
  onRegisterContact,
  onStartReschedule,
  onCancelReschedule,
  onChangeReschedule,
  onSaveReschedule,
  onCompleteFollowUp,
}: {
  selectedDate: string;
  events: CalendarEvent[];
  reschedulingId: string | null;
  completingId: string | null;
  rescheduleDraft: string;
  onRegisterContact: (client: CarteiraClient) => void;
  onStartReschedule: (event: CalendarEvent) => void;
  onCancelReschedule: () => void;
  onChangeReschedule: (date: string) => void;
  onSaveReschedule: (event: CalendarEvent) => void;
  onCompleteFollowUp: (event: CalendarEvent) => void;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Agenda do dia</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {getDateLabel(selectedDate)}
            </p>
          </div>
          <Badge variant="outline">{events.length} eventos</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {events.length ? (
          <div className="space-y-3">
            {events.map((event) => {
              const config = eventTypeConfig[event.type];

              return (
                <article
                  key={event.id}
                  className="rounded-lg border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={config.badge}>{config.label}</Badge>
                        <Badge variant="outline">{event.statusLabel}</Badge>
                        <StatusBadge status={event.client.nivel} />
                        <StatusBadge status={event.client.status} />
                      </div>
                      <h3 className="mt-2 truncate font-medium text-foreground">
                        {event.client.cliente}
                      </h3>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {event.client.telefone} / {event.client.vendedor}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {event.client.cidade}/{event.client.bairro}
                      </div>
                    </div>
                    <div className={cn("mt-1 h-3 w-3 rounded-full", config.dot)} />
                  </div>
                  <p className="mt-3 text-sm text-foreground">
                    {event.description}
                  </p>
                  <EventActions
                    event={event}
                    reschedulingId={reschedulingId}
                    completingId={completingId}
                    rescheduleDraft={rescheduleDraft}
                    onRegisterContact={onRegisterContact}
                    onStartReschedule={onStartReschedule}
                    onCancelReschedule={onCancelReschedule}
                    onChangeReschedule={onChangeReschedule}
                    onSaveReschedule={onSaveReschedule}
                    onCompleteFollowUp={onCompleteFollowUp}
                  />
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Nenhum evento neste dia"
            description="Selecione outro dia ou ajuste os filtros para visualizar follow-ups, compras e visitas."
          />
        )}
      </CardContent>
    </Card>
  );
}

function CalendarSourceNotice({ source }: { source: LoadCalendarioResult }) {
  if (source.status === "available") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
        <Database className="h-4 w-4 text-primary" />
        <span>Dados carregados do Supabase para o calendario operacional.</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        source.status === "error"
          ? "border-danger-soft bg-danger-soft text-danger-soft-foreground"
          : "border-warning bg-warning text-warning-foreground",
      )}
    >
      <Database className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {source.message ??
          "Calendario em modo local/mock enquanto o Supabase nao retorna dados."}
      </span>
    </div>
  );
}

export function CalendarioView({
  initialCalendario,
}: {
  initialCalendario: LoadCalendarioResult;
}) {
  const { awardInteractionPoints } = useGamification();
  const isSupabaseAvailable = initialCalendario.status === "available";
  const [clients, setClients] = useState<CarteiraClient[]>(() =>
    isSupabaseAvailable
      ? initialCalendario.clients
      : getCarteiraClientsWithPublishedImports(),
  );
  const [supabaseEvents, setSupabaseEvents] = useState<CalendarEvent[]>(
    () => initialCalendario.events,
  );
  const [interactions, setInteractions] = useState<CarteiraInteraction[]>([]);
  const [currentMonth, setCurrentMonth] = useState(INITIAL_MONTH);
  const [selectedDate, setSelectedDate] = useState(INITIAL_SELECTED_DATE);
  const [viewMode, setViewMode] = useState<CalendarViewMode>("mes");
  const [vendor, setVendor] = useState("todos");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [eventType, setEventType] = useState<EventTypeFilter>("todos");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [reschedules, setReschedules] = useState<Record<string, string>>({});
  const [completedEventIds, setCompletedEventIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [rescheduleDraft, setRescheduleDraft] = useState("");
  const [persistenceToasts, setPersistenceToasts] = useState<PersistenceToast[]>(
    [],
  );

  useEffect(() => {
    if (isSupabaseAvailable && clients.length > 0) {
      saveSupabaseCarteiraSnapshot(clients);
    }
  }, [clients, isSupabaseAvailable]);

  const vendorOptions = useMemo<SelectOption[]>(
    () => [
      { value: "todos", label: "Todos os vendedores" },
      ...Array.from(new Set(clients.map((client) => client.vendedor)))
        .sort((first, second) => first.localeCompare(second, "pt-BR"))
        .map((item) => ({ value: item, label: item })),
    ],
    [clients],
  );

  const allEvents = useMemo(() => {
    const baseEvents = isSupabaseAvailable
      ? [
          ...supabaseEvents.map((event) =>
            applyRuntimeState(event, reschedules, completedEventIds),
          ),
          ...buildSessionInteractionEvents({ clients, interactions, reschedules }),
        ]
      : buildLocalCalendarEvents({ clients, interactions, reschedules });

    return sortEvents(baseEvents);
  }, [
    clients,
    completedEventIds,
    interactions,
    isSupabaseAvailable,
    reschedules,
    supabaseEvents,
  ]);

  const filteredEvents = useMemo(
    () =>
      allEvents.filter(
        (event) =>
          (vendor === "todos" || event.client.vendedor === vendor) &&
          eventMatchesStatus(event, status) &&
          (eventType === "todos" || event.type === eventType),
      ),
    [allEvents, eventType, status, vendor],
  );

  const eventsByDate = useMemo(() => {
    const groups = new Map<string, CalendarEvent[]>();

    filteredEvents.forEach((event) => {
      groups.set(event.date, [...(groups.get(event.date) ?? []), event]);
    });

    return groups;
  }, [filteredEvents]);

  const visibleDays = useMemo(
    () =>
      viewMode === "mes"
        ? buildMonthCells(currentMonth, selectedDate)
        : buildWeekCells(selectedDate),
    [currentMonth, selectedDate, viewMode],
  );

  const selectedDateEvents = eventsByDate.get(selectedDate) ?? [];
  const selectedClient = selectedClientId
    ? clients.find((client) => client.id === selectedClientId) ?? null
    : null;
  const monthEvents = filteredEvents.filter((event) =>
    event.date.startsWith(currentMonth),
  );
  const counts = {
    total: monthEvents.length,
    vencidos: monthEvents.filter((event) => event.type === "vencido").length,
    visitas: monthEvents.filter((event) => event.type === "visita").length,
    convertidos: monthEvents.filter((event) => event.type === "convertido").length,
  };

  function dismissPersistenceToast(id: string) {
    setPersistenceToasts((current) =>
      current.filter((toast) => toast.id !== id),
    );
  }

  function showPersistenceToast(
    result: Parameters<typeof buildPersistenceToast>[0],
  ) {
    const toast = buildPersistenceToast(result);

    setPersistenceToasts((current) => [toast, ...current].slice(0, 3));
    window.setTimeout(() => dismissPersistenceToast(toast.id), 4200);
  }

  function handleSelectDate(date: string) {
    setSelectedDate(date);

    if (viewMode === "mes" && !date.startsWith(currentMonth)) {
      setCurrentMonth(date.slice(0, 7));
    }
  }

  function goToPrevious() {
    if (viewMode === "semana") {
      const date = addDays(selectedDate, -7);
      setSelectedDate(date);
      setCurrentMonth(date.slice(0, 7));
      return;
    }

    const month = addMonths(currentMonth, -1);
    setCurrentMonth(month);
    setSelectedDate(`${month}-01`);
  }

  function goToNext() {
    if (viewMode === "semana") {
      const date = addDays(selectedDate, 7);
      setSelectedDate(date);
      setCurrentMonth(date.slice(0, 7));
      return;
    }

    const month = addMonths(currentMonth, 1);
    setCurrentMonth(month);
    setSelectedDate(`${month}-01`);
  }

  function goToToday() {
    setCurrentMonth(TODAY.slice(0, 7));
    setSelectedDate(TODAY);
  }

  function startReschedule(event: CalendarEvent) {
    setReschedulingId(event.id);
    setRescheduleDraft(event.date);
  }

  async function saveReschedule(event: CalendarEvent) {
    if (!reschedulingId || !rescheduleDraft) {
      return;
    }

    const result = await rescheduleCalendarFollowUpAction({
      followUpId: event.followUpId,
      dueDate: rescheduleDraft,
    });

    showPersistenceToast(result);
    setReschedules((current) => ({
      ...current,
      [reschedulingId]: rescheduleDraft,
    }));
    setSupabaseEvents((current) =>
      current.map((calendarEvent) =>
        calendarEvent.id === event.id
          ? {
              ...calendarEvent,
              date: rescheduleDraft,
              type: rescheduleDraft < TODAY ? "vencido" : "follow_up",
              statusLabel: rescheduleDraft < TODAY ? "Vencido" : "Aberto",
            }
          : calendarEvent,
      ),
    );
    setSelectedDate(rescheduleDraft);
    setCurrentMonth(rescheduleDraft.slice(0, 7));
    setReschedulingId(null);
    setRescheduleDraft("");
  }

  async function completeFollowUp(event: CalendarEvent) {
    setCompletingId(event.id);

    try {
      const result = await completeCalendarFollowUpAction({
        followUpId: event.followUpId,
      });

      showPersistenceToast(result);

      if (result.status !== "error") {
        setCompletedEventIds((current) => new Set(current).add(event.id));
        setSupabaseEvents((current) =>
          current.map((calendarEvent) =>
            calendarEvent.id === event.id
              ? {
                  ...calendarEvent,
                  type: "follow_up",
                  statusLabel: "Concluido",
                  canComplete: false,
                  canReschedule: false,
                }
              : calendarEvent,
          ),
        );
      }
    } catch (error) {
      showPersistenceToast({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel concluir o follow-up.",
      });
    } finally {
      setCompletingId(null);
    }
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
    const awardedPointEvents = sourceClient
      ? awardInteractionPoints({
          client: sourceClient,
          interaction,
          createdAt,
        })
      : [];

    if (sourceClient) {
      saveInteractionToSupabaseAction({
        client: sourceClient,
        interaction,
        pointEvents: awardedPointEvents,
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
        eyebrow="Rotina comercial"
        title="Calendario"
        description="Visualize follow-ups, proximas compras e visitas em visao mensal ou semanal."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={goToToday}>
              <CalendarDays className="h-4 w-4" />
              Hoje
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const firstClient = clients[0];
                if (firstClient) {
                  setSelectedClientId(firstClient.id);
                }
              }}
            >
              <CalendarClock className="h-4 w-4" />
              Novo follow-up
            </Button>
          </>
        }
      />

      <CalendarSourceNotice source={initialCalendario} />

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]">
          <SelectFilter
            label="Vendedor"
            value={vendor}
            options={vendorOptions}
            onChange={setVendor}
          />
          <SelectFilter
            label="Status"
            value={status}
            options={statusOptions}
            onChange={(value) => setStatus(value as StatusFilter)}
          />
          <SelectFilter
            label="Tipo"
            value={eventType}
            options={eventTypeOptions}
            onChange={(value) => setEventType(value as EventTypeFilter)}
          />
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant={viewMode === "mes" ? "subtle" : "outline"}
              size="sm"
              onClick={() => setViewMode("mes")}
            >
              Mes
            </Button>
            <Button
              type="button"
              variant={viewMode === "semana" ? "subtle" : "outline"}
              size="sm"
              onClick={() => setViewMode("semana")}
            >
              Semana
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Eventos no mes</div>
            <div className="mt-1 text-2xl font-semibold">{counts.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Vencidos</div>
            <div className="mt-1 text-2xl font-semibold text-danger-soft-foreground">
              {counts.vencidos}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Visitas</div>
            <div className="mt-1 text-2xl font-semibold text-warning-foreground">
              {counts.visitas}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground">Convertidos</div>
            <div className="mt-1 text-2xl font-semibold text-success-foreground">
              {counts.convertidos}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.72fr)]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Periodo anterior"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Proximo periodo"
                onClick={goToNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="min-w-0 truncate text-lg font-semibold">
                {viewMode === "mes"
                  ? getMonthLabel(currentMonth)
                  : `Semana de ${getDateLabel(getWeekStart(selectedDate))}`}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {eventTypeOptions.slice(1).map((option) => {
                const type = option.value as CalendarEventType;
                const config = eventTypeConfig[type];

                return (
                  <span
                    key={option.value}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <span className={cn("h-2 w-2 rounded-full", config.dot)} />
                    {option.label}
                  </span>
                );
              })}
            </div>
          </div>

          <CalendarGrid
            days={visibleDays}
            eventsByDate={eventsByDate}
            viewMode={viewMode}
            onSelectDate={handleSelectDate}
          />
        </div>

        <DayEventsPanel
          selectedDate={selectedDate}
          events={selectedDateEvents}
          reschedulingId={reschedulingId}
          completingId={completingId}
          rescheduleDraft={rescheduleDraft}
          onRegisterContact={(client) => setSelectedClientId(client.id)}
          onStartReschedule={startReschedule}
          onCancelReschedule={() => {
            setReschedulingId(null);
            setRescheduleDraft("");
          }}
          onChangeReschedule={setRescheduleDraft}
          onSaveReschedule={saveReschedule}
          onCompleteFollowUp={completeFollowUp}
        />
      </section>

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
