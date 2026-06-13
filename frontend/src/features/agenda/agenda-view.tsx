"use client";

import {
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Eye,
  MessageCircle,
  PhoneCall,
  RefreshCw,
  Route,
  Save,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGamification } from "@/features/gamification/gamification-provider";
import { cn } from "@/lib/utils";
import {
  completeAgendaFollowUpAction,
  loadAgendaFromSupabaseAction,
  rescheduleAgendaFollowUpAction,
} from "@/features/agenda/actions";
import { saveInteractionToSupabaseAction } from "@/features/carteira/actions";
import {
  getCarteiraClientsWithPublishedImports,
  persistImportedClientUpdate,
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
} from "@/features/carteira/types";
import type {
  AgendaFilter,
  AgendaGroupKey,
  AgendaItem,
  AgendaMutationResult,
  LoadAgendaResult,
} from "./types";

const TODAY = "2026-05-27";
const WEEK_LIMIT = "2026-06-03";

type NewFollowUpForm = {
  clientId: string;
  date: string;
  observation: string;
};

const quickFilters: { value: AgendaFilter; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "vencidos", label: "Vencidos" },
  { value: "semana", label: "Semana" },
  { value: "todos", label: "Todos" },
];

const groupConfig: Record<
  AgendaGroupKey,
  { title: string; description: string; icon: typeof Clock3 }
> = {
  vencidos: {
    title: "Vencidos",
    description: "Pendências com prazo anterior a hoje.",
    icon: Clock3,
  },
  hoje: {
    title: "Hoje",
    description: "Contatos e próximas compras para resolver no dia.",
    icon: CalendarClock,
  },
  proximos_7: {
    title: "Próximos 7 dias",
    description: "Oportunidades que entram na rotina da semana.",
    icon: CalendarPlus,
  },
  aguardando: {
    title: "Aguardando retorno",
    description: "Clientes já acionados que precisam de acompanhamento.",
    icon: RefreshCw,
  },
  visitas: {
    title: "Visitas encaminhadas",
    description: "Atendimentos direcionados para visita comercial.",
    icon: Route,
  },
};

const groupOrder: AgendaGroupKey[] = [
  "vencidos",
  "hoje",
  "proximos_7",
  "aguardando",
  "visitas",
];

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

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  timeZone: "UTC",
});

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

function buildInteractionId() {
  return `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveDate(itemId: string, date: string, reschedules: Record<string, string>) {
  return reschedules[itemId] ?? date;
}

function getDateGroup(date: string): AgendaGroupKey | null {
  if (date < TODAY) {
    return "vencidos";
  }

  if (date === TODAY) {
    return "hoje";
  }

  if (date <= WEEK_LIMIT) {
    return "proximos_7";
  }

  return null;
}

function getStatusGroup(status: CarteiraClient["status"]) {
  if (status === "aguardando") {
    return "aguardando";
  }

  if (status === "visita") {
    return "visitas";
  }

  return null;
}

function buildAgendaItems({
  clients,
  interactions,
  reschedules,
}: {
  clients: CarteiraClient[];
  interactions: CarteiraInteraction[];
  reschedules: Record<string, string>;
}) {
  const items: AgendaItem[] = [];

  clients.forEach((client) => {
    const statusGroup = getStatusGroup(client.status);

    if (statusGroup) {
      const itemId = `status-${client.id}`;
      const fallbackDate = client.proximaCompra ?? TODAY;

      items.push({
        id: itemId,
        clienteId: client.id,
        source: "status",
        group: statusGroup,
        cliente: client,
        motivo:
          client.status === "visita"
            ? "Visita encaminhada para acompanhamento"
            : "Aguardando retorno do cliente",
        prazo: resolveDate(itemId, fallbackDate, reschedules),
        status: client.status,
        classificacao: client.nivel,
      });

      return;
    }

    const dateGroup = getDateGroup(client.proximaCompra ?? "");

    if (!dateGroup || !client.proximaCompra) {
      return;
    }

    const itemId = `proxima-${client.id}`;

    items.push({
      id: itemId,
      clienteId: client.id,
      source: "proxima_compra",
      group: getDateGroup(resolveDate(itemId, client.proximaCompra, reschedules)) ?? dateGroup,
      cliente: client,
      motivo: "Próxima compra prevista",
      prazo: resolveDate(itemId, client.proximaCompra, reschedules),
      status: client.status,
      classificacao: client.nivel,
    });
  });

  interactions.forEach((interaction) => {
    if (!interaction.proximoFollowUp) {
      return;
    }

    const client = clients.find((item) => item.id === interaction.clienteId);

    if (!client) {
      return;
    }

    const itemId = `interaction-${interaction.id}`;
    const prazo = resolveDate(itemId, interaction.proximoFollowUp, reschedules);
    const group = getDateGroup(prazo);

    if (!group) {
      return;
    }

    items.push({
      id: itemId,
      clienteId: client.id,
      source: "interaction",
      group,
      cliente: client,
      motivo: interaction.observacao ?? "Follow-up criado na sessão",
      prazo,
      status: interaction.status,
      classificacao: client.nivel,
    });
  });

  return items.sort((first, second) => {
    if (first.prazo === second.prazo) {
      return first.cliente.cliente.localeCompare(second.cliente.cliente, "pt-BR");
    }

    return first.prazo.localeCompare(second.prazo);
  });
}

function filterAgendaItems(items: AgendaItem[], filter: AgendaFilter) {
  if (filter === "todos") {
    return items;
  }

  if (filter === "hoje") {
    return items.filter((item) => item.prazo === TODAY);
  }

  if (filter === "vencidos") {
    return items.filter((item) => item.prazo < TODAY);
  }

  return items.filter((item) => item.prazo >= TODAY && item.prazo <= WEEK_LIMIT);
}

function applyAgendaReschedules(
  items: AgendaItem[],
  reschedules: Record<string, string>,
) {
  return items.map((item) => {
    const prazo = resolveDate(item.id, item.prazo, reschedules);
    const nextGroup =
      item.source === "follow_up" ||
      item.source === "proxima_compra" ||
      item.source === "interaction"
        ? getDateGroup(prazo) ?? item.group
        : item.group;

    return {
      ...item,
      prazo,
      group: nextGroup,
    };
  });
}

function AgendaSummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  return (
    <div className="rounded-md border bg-muted/35 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-xl font-semibold",
          tone === "warning" && "text-warning-foreground",
          tone === "danger" && "text-danger-soft-foreground",
          tone === "success" && "text-success-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function AgendaItemCard({
  item,
  isRescheduling,
  draftDate,
  onDraftDateChange,
  onStartReschedule,
  onCancelReschedule,
  onSaveReschedule,
  onComplete,
  onRegisterContact,
}: {
  item: AgendaItem;
  isRescheduling: boolean;
  draftDate: string;
  onDraftDateChange: (value: string) => void;
  onStartReschedule: () => void;
  onCancelReschedule: () => void;
  onSaveReschedule: () => void;
  onComplete: () => void;
  onRegisterContact: () => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">
              {item.cliente.cliente}
            </h3>
            <StatusBadge status={item.classificacao} />
            <StatusBadge status={item.status} />
          </div>
          <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-5">
            <span className="truncate">{item.cliente.telefone}</span>
            <span className="truncate">
              {item.cliente.cidade} / {item.cliente.bairro}
            </span>
            <span className="truncate">Resp.: {item.cliente.vendedor}</span>
            <span className="truncate">{item.motivo}</span>
            <span className="font-medium text-foreground">
              Prazo: {formatDate(item.prazo)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button type="button" size="sm" onClick={onRegisterContact}>
            <PhoneCall className="h-4 w-4" />
            Registrar contato
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onStartReschedule}
          >
            <CalendarClock className="h-4 w-4" />
            Reagendar
          </Button>
          {item.canComplete ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onComplete}
            >
              <CheckCircle2 className="h-4 w-4" />
              Concluir
            </Button>
          ) : null}
          <Button asChild type="button" size="sm" variant="ghost">
            <Link href={`/clientes/${item.clienteId}`}>
              <Eye className="h-4 w-4" />
              Ver cliente
            </Link>
          </Button>
        </div>
      </div>

      {isRescheduling ? (
        <div className="mt-3 flex flex-col gap-2 rounded-md border bg-muted/35 p-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1">
            <Label htmlFor={`reschedule-${item.id}`}>Nova data</Label>
            <Input
              id={`reschedule-${item.id}`}
              type="date"
              value={draftDate}
              onChange={(event) => onDraftDateChange(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={onSaveReschedule}>
              <Save className="h-4 w-4" />
              Salvar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancelReschedule}
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AgendaSourceNotice({ agenda }: { agenda: LoadAgendaResult }) {
  if (agenda.status === "available") {
    return (
      <div className="mb-4 rounded-lg border border-success bg-success px-3 py-2 text-sm text-success-foreground shadow-sm">
        Agenda carregada do Supabase com {agenda.items.length} pendências reais.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-4 rounded-lg border px-3 py-2 text-sm shadow-sm",
        agenda.status === "error"
          ? "border-danger-soft bg-danger-soft text-danger-soft-foreground"
          : "border-warning bg-warning text-warning-foreground",
      )}
    >
      {agenda.message ??
        "A agenda está usando dados locais/mock até existir uma base real disponível."}
    </div>
  );
}

export function AgendaView({ initialAgenda }: { initialAgenda: LoadAgendaResult }) {
  const { awardInteractionPoints } = useGamification();
  const initialClients =
    initialAgenda.clients.length > 0
      ? initialAgenda.clients
      : getCarteiraClientsWithPublishedImports();
  const [agendaSource, setAgendaSource] =
    useState<LoadAgendaResult>(initialAgenda);
  const [clients, setClients] = useState<CarteiraClient[]>(initialClients);
  const [realAgendaItems, setRealAgendaItems] = useState<AgendaItem[]>(
    initialAgenda.status === "available" ? initialAgenda.items : [],
  );
  const [interactions, setInteractions] = useState<CarteiraInteraction[]>([]);
  const [activeFilter, setActiveFilter] = useState<AgendaFilter>("hoje");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [reschedules, setReschedules] = useState<Record<string, string>>({});
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDraft, setRescheduleDraft] = useState("");
  const [persistenceToasts, setPersistenceToasts] = useState<
    PersistenceToast[]
  >([]);
  const [newFollowUpOpen, setNewFollowUpOpen] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState<NewFollowUpForm>(() => ({
    clientId: initialClients[0]?.id ?? "",
    date: TODAY,
    observation: "",
  }));

  const selectedClient = selectedClientId
    ? clients.find((client) => client.id === selectedClientId) ?? null
    : null;

  const hasRealAgenda = agendaSource.status === "available";

  const agendaItems = useMemo(() => {
    const baseItems = hasRealAgenda
      ? realAgendaItems
      : buildAgendaItems({ clients, interactions, reschedules: {} });

    return applyAgendaReschedules(baseItems, reschedules);
  }, [clients, hasRealAgenda, interactions, realAgendaItems, reschedules]);

  const filteredItems = useMemo(
    () => filterAgendaItems(agendaItems, activeFilter),
    [activeFilter, agendaItems],
  );

  const groupedItems = useMemo(
    () =>
      groupOrder.map((group) => ({
        group,
        items: filteredItems.filter((item) => item.group === group),
      })),
    [filteredItems],
  );

  const summary = useMemo(
    () => ({
      pendenciasHoje: agendaItems.filter((item) => item.prazo === TODAY).length,
      vencidos: agendaItems.filter((item) => item.prazo < TODAY).length,
      contatosFeitos:
        clients.filter((client) => client.status === "contatado").length +
        interactions.length,
      conversoes: clients.filter((client) => client.status === "convertido").length,
      visitas: clients.filter((client) => client.status === "visita").length,
      proximos: agendaItems.filter(
        (item) => item.prazo > TODAY && item.prazo <= WEEK_LIMIT,
      ).length,
    }),
    [agendaItems, clients, interactions.length],
  );

  function dismissPersistenceToast(id: string) {
    setPersistenceToasts((current) =>
      current.filter((toast) => toast.id !== id),
    );
  }

  function showPersistenceToast(
    result: AgendaMutationResult | Parameters<typeof buildPersistenceToast>[0],
  ) {
    const toast = buildPersistenceToast(result);

    setPersistenceToasts((current) => [toast, ...current].slice(0, 3));
    window.setTimeout(() => dismissPersistenceToast(toast.id), 4200);
  }

  async function refreshAgenda() {
    const nextAgenda = await loadAgendaFromSupabaseAction();

    setAgendaSource(nextAgenda);

    if (nextAgenda.status !== "available") {
      return;
    }

    setClients(nextAgenda.clients);
    setRealAgendaItems(nextAgenda.items);
    setInteractions([]);
    setReschedules({});
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
          origem: interactionInput.observacao?.includes("Novo follow-up manual")
            ? "agenda_follow_up"
            : "interaction_drawer",
        })
      : [];

    if (sourceClient) {
      saveInteractionToSupabaseAction({
        client: sourceClient,
        interaction,
        pointEvents: awardedPointEvents,
        lastActionLabel,
      })
        .then((result) => {
          showPersistenceToast(result);

          if (result.status === "saved") {
            void refreshAgenda();
          }
        })
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

  function startReschedule(item: AgendaItem) {
    setReschedulingId(item.id);
    setRescheduleDraft(item.prazo);
  }

  async function saveReschedule(item: AgendaItem) {
    if (!reschedulingId || !rescheduleDraft) {
      return;
    }

    const result = await rescheduleAgendaFollowUpAction({
      followUpId: item.followUpId,
      dueDate: rescheduleDraft,
    });

    showPersistenceToast(result);
    setReschedules((current) => ({
      ...current,
      [reschedulingId]: rescheduleDraft,
    }));
    setRealAgendaItems((current) =>
      current.map((agendaItem) =>
        agendaItem.id === item.id
          ? {
              ...agendaItem,
              prazo: rescheduleDraft,
              group: getDateGroup(rescheduleDraft) ?? agendaItem.group,
            }
          : agendaItem,
      ),
    );
    setReschedulingId(null);
    setRescheduleDraft("");

    if (result.status === "saved") {
      void refreshAgenda();
    }
  }

  async function completeFollowUp(item: AgendaItem) {
    const result = await completeAgendaFollowUpAction({
      followUpId: item.followUpId,
    });

    showPersistenceToast(result);
    if (result.status !== "error") {
      setRealAgendaItems((current) =>
        current.filter((agendaItem) => agendaItem.id !== item.id),
      );
    }

    if (result.status === "saved") {
      void refreshAgenda();
    }
  }

  function saveNewFollowUp() {
    if (!newFollowUp.clientId || !newFollowUp.date) {
      return;
    }

    handleSaveInteraction({
      clienteId: newFollowUp.clientId,
      status: "aguardando",
      tipo: "loja",
      canal: "telefone",
      observacao: newFollowUp.observation.trim() || "Novo follow-up manual",
      valorRecuperado: null,
      proximoFollowUp: newFollowUp.date,
    });
    setNewFollowUpOpen(false);
    setNewFollowUp((current) => ({
      clientId: current.clientId,
      date: TODAY,
      observation: "",
    }));
  }

  return (
    <>
      <PageHeader
        title="Minha agenda"
        description="Acompanhe retornos, próximas compras e pendências do dia"
        actions={
          <Button
            type="button"
            size="sm"
            onClick={() => setNewFollowUpOpen((current) => !current)}
          >
            <CalendarPlus className="h-4 w-4" />
            Novo follow-up
          </Button>
        }
      />

      <AgendaSourceNotice agenda={agendaSource} />

      <div className="mb-4 flex flex-wrap gap-2">
        {quickFilters.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            size="sm"
            variant={activeFilter === filter.value ? "subtle" : "outline"}
            onClick={() => setActiveFilter(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {newFollowUpOpen ? (
        <Card className="mb-4">
          <CardContent className="grid gap-3 p-3 md:grid-cols-[minmax(220px,1fr)_180px_minmax(220px,1.2fr)_auto] md:items-end">
            <label className="space-y-1">
              <span className="text-sm font-medium">Cliente</span>
              <select
                value={newFollowUp.clientId}
                onChange={(event) =>
                  setNewFollowUp((current) => ({
                    ...current,
                    clientId: event.target.value,
                  }))
                }
                className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.cliente}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">Data</span>
              <Input
                type="date"
                value={newFollowUp.date}
                onChange={(event) =>
                  setNewFollowUp((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">Observação</span>
              <Textarea
                value={newFollowUp.observation}
                onChange={(event) =>
                  setNewFollowUp((current) => ({
                    ...current,
                    observation: event.target.value,
                  }))
                }
                className="min-h-9"
                placeholder="Motivo do retorno"
              />
            </label>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={saveNewFollowUp}>
                Salvar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setNewFollowUpOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-4">
          {groupedItems.some((entry) => entry.items.length > 0) ? (
            groupedItems.map(({ group, items }) => {
              if (!items.length) {
                return null;
              }

              const config = groupConfig[group];
              const Icon = config.icon;

              return (
                <Card key={group}>
                  <CardHeader className="flex-row items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle>{config.title}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{items.length}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {items.map((item) => (
                      <AgendaItemCard
                        key={item.id}
                        item={item}
                        isRescheduling={reschedulingId === item.id}
                        draftDate={rescheduleDraft}
                        onDraftDateChange={setRescheduleDraft}
                        onStartReschedule={() => startReschedule(item)}
                        onCancelReschedule={() => {
                          setReschedulingId(null);
                          setRescheduleDraft("");
                        }}
                        onSaveReschedule={() => void saveReschedule(item)}
                        onComplete={() => void completeFollowUp(item)}
                        onRegisterContact={() => setSelectedClientId(item.clienteId)}
                      />
                    ))}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <EmptyState
              title="Nenhuma pendência neste filtro"
              description="Altere o filtro rápido ou crie um novo follow-up para compor sua rotina."
            />
          )}
        </section>

        <aside className="space-y-4">
          <Card className="xl:sticky xl:top-20">
            <CardHeader>
              <CardTitle>Resumo do dia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AgendaSummaryCard
                label="Pendências do dia"
                value={summary.pendenciasHoje}
                tone="warning"
              />
              <AgendaSummaryCard
                label="Vencidos"
                value={summary.vencidos}
                tone="danger"
              />
              <AgendaSummaryCard
                label="Contatos feitos"
                value={summary.contatosFeitos}
              />
              <AgendaSummaryCard
                label="Conversões"
                value={summary.conversoes}
                tone="success"
              />
              <AgendaSummaryCard
                label="Visitas encaminhadas"
                value={summary.visitas}
              />
              <AgendaSummaryCard
                label="Próximos follow-ups"
                value={summary.proximos}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => setActiveFilter("vencidos")}
              >
                <Clock3 className="h-4 w-4" />
                Ver vencidos
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => setActiveFilter("semana")}
              >
                <CalendarClock className="h-4 w-4" />
                Planejar semana
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/carteira">
                  <MessageCircle className="h-4 w-4" />
                  Abrir carteira
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

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
