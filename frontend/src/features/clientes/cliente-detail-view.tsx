"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  MessageCircle,
  PhoneCall,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGamification } from "@/features/gamification/gamification-provider";
import { cn } from "@/lib/utils";
import { saveInteractionToSupabaseAction } from "@/features/carteira/actions";
import {
  loadClienteDetailFromSupabaseAction,
  updateClienteFinancialStatusAction,
} from "@/features/clientes/actions";
import {
  persistImportedClientUpdate,
  useCarteiraDetailClientsSource,
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
  FinancialStatus,
} from "@/features/carteira/types";
import {
  FINANCIAL_RESTRICTION_MESSAGE,
  financialStatusEditOptions,
  getClientFinancialStatus,
  hasFinancialRestriction,
} from "@/features/carteira/financial-status";
import {
  getOperationalClientLevel,
  isClientConverted,
  matchesOperationalLevel,
} from "@/features/carteira/operational-rules";
import type { PointEvent } from "@/features/gamification/types";
import { getCurrentPeriod } from "@/lib/current-period";
import type {
  ClienteDetailFollowUp,
  ClienteDetailPointEvent,
  LoadClienteDetailResult,
} from "./types";

const TODAY = getCurrentPeriod().date;

type FollowUpStatus = "aberto" | "vencido" | "concluido";

type FollowUpItem = ClienteDetailFollowUp;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const shortCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
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

const followUpStatusConfig: Record<
  FollowUpStatus,
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  aberto: { label: "Aberto", variant: "info" },
  vencido: { label: "Em atraso", variant: "danger" },
  concluido: { label: "Concluído", variant: "success" },
};

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

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

function buildInteractionId() {
  return `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getCycleDays(client: CarteiraClient) {
  if (client.cicloMedioCompraDias) {
    return client.cicloMedioCompraDias;
  }

  const operationalLevel = getOperationalClientLevel(client, TODAY);

  if (operationalLevel === "saudavel") {
    return 32;
  }

  if (operationalLevel === "atencao") {
    return 60;
  }

  if (operationalLevel === "risco") {
    return 90;
  }

  return 180;
}

function getOriginalSituation(client: CarteiraClient) {
  if (client.situacaoOriginal) {
    return client.situacaoOriginal;
  }

  if (isClientConverted(client, TODAY)) {
    return "Convertido nos últimos 30 dias";
  }

  if (matchesOperationalLevel(client, "inativo", TODAY)) {
    return "Inativo antigo";
  }

  return "Ativo";
}

function getMockInteractions(client: CarteiraClient): CarteiraInteraction[] {
  if (client.interacoes?.length) {
    return client.interacoes;
  }

  if (client.status === "nao_trabalhado") {
    return [];
  }

  const recoveredValue =
    client.status === "convertido" ? client.valorUltimoPedido : null;

  return [
    {
      id: `mock-${client.id}-1`,
      clienteId: client.id,
      status: client.status,
      tipo: "loja",
      canal:
        client.ultimaAcao.tipo.toLowerCase().includes("whatsapp")
          ? "whatsapp"
          : "telefone",
      observacao: client.ultimaAcao.tipo,
      valorRecuperado: recoveredValue,
      proximoFollowUp:
        client.status === "aguardando" || client.status === "visita"
          ? client.proximaCompra
          : null,
      criadoEm: `${client.ultimaAcao.data ?? client.ultimoPedido ?? TODAY}T13:30:00.000Z`,
    },
  ];
}

function getFollowUps(
  client: CarteiraClient,
  interactions: CarteiraInteraction[],
): FollowUpItem[] {
  const fromInteractions = interactions
    .filter((interaction) => interaction.proximoFollowUp)
    .map((interaction) => ({
      id: `follow-${interaction.id}`,
      status:
        interaction.proximoFollowUp &&
        interaction.proximoFollowUp < TODAY
          ? ("vencido" as const)
          : ("aberto" as const),
      dataPrevista: interaction.proximoFollowUp ?? TODAY,
      observacao:
        interaction.observacao ??
        `Retorno criado a partir de ${statusActionLabels[interaction.status]}.`,
    }));

  if (fromInteractions.length) {
    return fromInteractions;
  }

  const fallback: FollowUpItem[] = [];

  if (client.proximaCompra && !isClientConverted(client, TODAY)) {
    fallback.push({
      id: `follow-${client.id}-proxima`,
      status: client.proximaCompra < TODAY ? "vencido" : "aberto",
      dataPrevista: client.proximaCompra,
      observacao: "Validar recompra prevista e retomar contato comercial.",
    });
  }

  if (client.status === "convertido") {
    fallback.push({
      id: `follow-${client.id}-done`,
      status: "concluido",
      dataPrevista: client.ultimaAcao.data ?? client.ultimoPedido ?? TODAY,
      observacao: "Cliente convertido nesta etapa de reativação.",
    });
  }

  return fallback;
}

function buildFollowUpFromInteraction(
  interaction: CarteiraInteraction,
): FollowUpItem | null {
  if (!interaction.proximoFollowUp) {
    return null;
  }

  return {
    id: `local-follow-${interaction.id}`,
    status: interaction.proximoFollowUp < TODAY ? "vencido" : "aberto",
    dataPrevista: interaction.proximoFollowUp,
    observacao:
      interaction.observacao ??
      `Retorno criado a partir de ${statusActionLabels[interaction.status]}.`,
    origem: "local",
  };
}

function mapLocalPointEvent(event: PointEvent): ClienteDetailPointEvent {
  return {
    id: event.id,
    acao: event.acao,
    pontos: event.pontos,
    descricao: event.descricao,
    data: event.data,
    origem: event.origem,
  };
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 border-b py-3 last:border-b-0">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-sm text-foreground">{value}</div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  return (
    <Card>
      <CardContent className="p-3">
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
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

type FinancialSaveFeedback = {
  tone: "success" | "warning" | "danger";
  message: string;
};

function FinancialStatusCard({
  client,
  onSave,
}: {
  client: CarteiraClient;
  onSave: (input: {
    situacaoFinanceira: FinancialStatus;
    observacaoFinanceira: string | null;
  }) => Promise<FinancialSaveFeedback>;
}) {
  const [status, setStatus] = useState<FinancialStatus>(
    getClientFinancialStatus(client),
  );
  const [note, setNote] = useState(client.observacaoFinanceira ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FinancialSaveFeedback | null>(null);
  const restricted = hasFinancialRestriction(status);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const result = await onSave({
      situacaoFinanceira: status,
      observacaoFinanceira: note.trim() || null,
    });

    setFeedback(result);
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Situação Financeira</CardTitle>
        <StatusBadge status={status} />
      </CardHeader>
      <CardContent>
        {restricted ? (
          <div className="mb-4 rounded-lg border border-danger-soft/70 bg-danger-soft/35 p-3 text-sm text-danger-soft-foreground">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-5">{FINANCIAL_RESTRICTION_MESSAGE}</p>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="grid gap-3 lg:grid-cols-[220px_1fr_auto] lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="financial-status">Situação financeira</Label>
            <select
              id="financial-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as FinancialStatus)
              }
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              {financialStatusEditOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="financial-note">Observação financeira</Label>
            <Textarea
              id="financial-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Pendência, negociação, orientação do financeiro ou observação interna"
              maxLength={420}
              className="min-h-9 lg:min-h-9"
            />
          </div>

          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </form>

        {feedback ? (
          <div
            className={cn(
              "mt-3 rounded-md border px-3 py-2 text-sm",
              feedback.tone === "success" &&
                "border-success/60 bg-success/35 text-success-foreground",
              feedback.tone === "warning" &&
                "border-warning/60 bg-warning/35 text-warning-foreground",
              feedback.tone === "danger" &&
                "border-danger-soft/70 bg-danger-soft/35 text-danger-soft-foreground",
            )}
          >
            {feedback.message}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FollowUpBadge({ status }: { status: FollowUpStatus }) {
  const config = followUpStatusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function DetailSourceNotice({
  detail,
  hasClient,
}: {
  detail: LoadClienteDetailResult;
  hasClient: boolean;
}) {
  if (detail.status === "available") {
    return (
      <div className="rounded-lg border border-success bg-success px-3 py-2 text-sm text-success-foreground shadow-sm">
        Detalhe carregado do Supabase com histórico, follow-ups e pontos.
      </div>
    );
  }

  if (!hasClient) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm shadow-sm",
        detail.status === "error"
          ? "border-danger-soft bg-danger-soft text-danger-soft-foreground"
          : "border-warning bg-warning text-warning-foreground",
      )}
    >
      {detail.message ??
        "Supabase indisponível. Exibindo detalhe a partir do snapshot local/mock."}
    </div>
  );
}

function PointEventsCard({
  events,
}: {
  events: ClienteDetailPointEvent[];
}) {
  const totalPoints = events.reduce((total, event) => total + event.pontos, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pontos relacionados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 rounded-md border bg-muted/35 p-3">
          <div className="text-xs text-muted-foreground">
            Pontuação acumulada neste cliente
          </div>
          <div className="mt-1 text-2xl font-semibold text-primary">
            {totalPoints} pts
          </div>
        </div>

        {events.length ? (
          <div className="space-y-2">
            {events.slice(0, 8).map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="font-medium">{event.descricao}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(event.data)} · {event.origem}
                  </div>
                </div>
                <Badge variant="outline">+{event.pontos} pts</Badge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sem pontos registrados"
            description="As próximas interações pontuadas deste cliente aparecerão aqui."
          />
        )}
      </CardContent>
    </Card>
  );
}

export function ClienteDetailView({
  initialClient,
  initialDetail,
  clientId,
}: {
  initialClient: CarteiraClient | null;
  initialDetail: LoadClienteDetailResult;
  clientId: string;
}) {
  const { awardInteractionPoints } = useGamification();
  const sourceClients = useCarteiraDetailClientsSource();
  const localSourceClient =
    sourceClients.find((item) => item.id === clientId) ?? initialClient;
  const sourceClient = initialDetail.client ?? localSourceClient;
  const [clientOverride, setClientOverride] = useState<CarteiraClient | null>(
    null,
  );
  const client = clientOverride ?? sourceClient;
  const [interactions, setInteractions] = useState<CarteiraInteraction[]>(() =>
    initialDetail.interactions.length
      ? initialDetail.interactions
      : sourceClient
        ? getMockInteractions(sourceClient)
        : [],
  );
  const [realFollowUps, setRealFollowUps] = useState<FollowUpItem[]>(
    initialDetail.followUps,
  );
  const [pointEvents, setPointEvents] = useState<ClienteDetailPointEvent[]>(
    initialDetail.pointEvents,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [persistenceToasts, setPersistenceToasts] = useState<
    PersistenceToast[]
  >([]);

  const recoveredTotal = useMemo(
    () =>
      interactions.reduce(
        (total, interaction) => total + (interaction.valorRecuperado ?? 0),
        0,
      ),
    [interactions],
  );

  const followUps = useMemo(() => {
    if (realFollowUps.length > 0) {
      return realFollowUps;
    }

    return client ? getFollowUps(client, interactions) : [];
  }, [client, interactions, realFollowUps]);

  const followUpCounts = useMemo(
    () => ({
      aberto: followUps.filter((item) => item.status === "aberto").length,
      vencido: followUps.filter((item) => item.status === "vencido").length,
      concluido: followUps.filter((item) => item.status === "concluido").length,
      proximo: followUps.filter(
        (item) => item.status === "aberto" && item.dataPrevista >= TODAY,
      ).length,
    }),
    [followUps],
  );

  function handleSaveInteraction(interactionInput: CarteiraInteractionInput) {
    if (!client) {
      return;
    }

    const createdAt = new Date().toISOString();
    const interaction: CarteiraInteraction = {
      ...interactionInput,
      id: buildInteractionId(),
      criadoEm: createdAt,
    };
    const lastActionLabel = `${statusActionLabels[interaction.status]} via ${
      channelLabels[interaction.canal]
    }`;
    const awardedPointEvents = awardInteractionPoints({
      client,
      interaction,
      createdAt,
    });
    const localFollowUp = buildFollowUpFromInteraction(interaction);

    saveInteractionToSupabaseAction({
      interaction,
      client,
      pointEvents: awardedPointEvents,
      lastActionLabel,
    })
      .then((result) => {
        showPersistenceToast(result);

        if (result.status === "saved") {
          void refreshSupabaseDetail(client.id);
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

    setInteractions((current) => [interaction, ...current]);
    setPointEvents((current) => [
      ...awardedPointEvents.map(mapLocalPointEvent),
      ...current,
    ]);

    if (localFollowUp) {
      setRealFollowUps((current) => [localFollowUp, ...current]);
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
    setClientOverride(updatedClient);
    setDrawerOpen(false);
  }

  async function refreshSupabaseDetail(customerId: string) {
    const detail = await loadClienteDetailFromSupabaseAction(customerId);

    if (detail.status !== "available" || !detail.client) {
      return;
    }

    setClientOverride(detail.client);
    setInteractions(detail.interactions);
    setRealFollowUps(detail.followUps);
    setPointEvents(detail.pointEvents);
    persistImportedClientUpdate(detail.client);
  }

  async function handleSaveFinancialStatus(input: {
    situacaoFinanceira: FinancialStatus;
    observacaoFinanceira: string | null;
  }): Promise<FinancialSaveFeedback> {
    if (!client) {
      return {
        tone: "danger",
        message: "Cliente não encontrado para atualização financeira.",
      };
    }

    const updatedClient: CarteiraClient = {
      ...client,
      situacaoFinanceira: input.situacaoFinanceira,
      observacaoFinanceira: input.observacaoFinanceira,
    };

    setClientOverride(updatedClient);
    persistImportedClientUpdate(updatedClient);

    const result = await updateClienteFinancialStatusAction({
      customerId: client.id,
      situacaoFinanceira: input.situacaoFinanceira,
      observacaoFinanceira: input.observacaoFinanceira,
    });

    if (result.status === "success") {
      const savedClient: CarteiraClient = {
        ...updatedClient,
        situacaoFinanceira: result.situacaoFinanceira,
        observacaoFinanceira: result.observacaoFinanceira,
      };

      setClientOverride(savedClient);
      persistImportedClientUpdate(savedClient);

      return {
        tone: "success",
        message: result.message ?? "Situação financeira atualizada.",
      };
    }

    return {
      tone: result.status === "local_fallback" ? "warning" : "danger",
      message: result.message,
    };
  }

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

  if (!client) {
    return (
      <EmptyState
        title="Cliente não encontrado"
        description={
          initialDetail.message ??
          "Este cliente não existe no Supabase, no snapshot local ou na base mockada."
        }
      />
    );
  }

  const operationalStatus = getOperationalClientLevel(client, TODAY) ?? "convertido";

  return (
    <>
      <div className="space-y-4">
        <DetailSourceNotice detail={initialDetail} hasClient={Boolean(client)} />

        <div className="border-b pb-4">
          <Button asChild variant="ghost" size="sm" className="mb-3">
            <Link href="/carteira">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Carteira
            </Link>
          </Button>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold">
                {client.cliente}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={operationalStatus} />
                <StatusBadge status={client.status} />
                <StatusBadge status={getClientFinancialStatus(client)} />
                <Badge variant="outline">Responsável: {client.vendedor}</Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://wa.me/55${phoneDigits(client.telefone)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setDrawerOpen(true)}
              >
                <PhoneCall className="h-4 w-4" />
                Registrar contato
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDrawerOpen(true)}
              >
                <CalendarPlus className="h-4 w-4" />
                Agendar follow-up
              </Button>
            </div>
          </div>
        </div>

        {hasFinancialRestriction(client) ? (
          <div className="rounded-lg border border-danger-soft/70 bg-danger-soft/35 px-4 py-3 text-sm text-danger-soft-foreground">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-5">{FINANCIAL_RESTRICTION_MESSAGE}</p>
            </div>
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Último pedido"
            value={formatDate(client.ultimoPedido)}
            hint={shortCurrencyFormatter.format(client.valorUltimoPedido)}
          />
          <SummaryCard
            label="Dias sem comprar"
            value={client.diasSemComprar}
              tone={
                client.diasSemComprar >= 90
                  ? "danger"
                  : client.diasSemComprar >= 60
                    ? "warning"
                    : "default"
              }
          />
          <SummaryCard
            label="Próxima compra"
            value={formatDate(client.proximaCompra)}
          />
          {recoveredTotal > 0 ? (
            <SummaryCard
              label="Valor recuperado"
              value={currencyFormatter.format(recoveredTotal)}
              tone="success"
            />
          ) : null}
          <SummaryCard
            label="Status atual"
            value={<StatusBadge status={client.status} />}
          />
        </section>

        <FinancialStatusCard
          key={`${client.id}-${client.situacaoFinanceira}-${client.observacaoFinanceira ?? ""}`}
          client={client}
          onSave={handleSaveFinancialStatus}
        />

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Dados comerciais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-6 sm:grid-cols-2">
                <DetailRow
                  label="Razão social"
                  value={client.razaoSocial ?? client.cliente}
                />
                <DetailRow
                  label="Nome fantasia"
                  value={client.nomeFantasia ?? "-"}
                />
                <DetailRow label="CNPJ/CPF" value={client.documento ?? "-"} />
                <DetailRow
                  label="Inscrição estadual"
                  value={client.inscricaoEstadual ?? "-"}
                />
                <DetailRow label="Telefone" value={client.telefone} />
                <DetailRow label="E-mail" value={client.email ?? "-"} />
                <DetailRow label="Cidade" value={client.cidade} />
                <DetailRow label="Bairro" value={client.bairro} />
                <DetailRow
                  label="Endereço"
                  value={client.endereco ?? "Não informado"}
                />
                <DetailRow
                  label="Vendedor do último pedido"
                  value={client.vendedorUltimoPedido ?? client.vendedor}
                />
                <DetailRow
                  label="Número do último pedido"
                  value={client.ultimoPedidoNumero ?? "-"}
                />
                <DetailRow
                  label="Data do último pedido"
                  value={formatDate(client.ultimoPedido)}
                />
                <DetailRow
                  label="Ciclo médio de compra"
                  value={`${getCycleDays(client)} dias`}
                />
                <DetailRow
                  label="Situação original"
                  value={getOriginalSituation(client)}
                />
                <DetailRow
                  label="Data de cadastro"
                  value={formatDate(client.dataCadastro ?? null)}
                />
                <DetailRow
                  label="Origem do cadastro"
                  value={client.origemCadastro ?? "-"}
                />
                <DetailRow label="Acesso B2B" value={client.acessoB2B ?? "-"} />
                <DetailRow label="Segmento" value={client.segmento ?? "-"} />
                <DetailRow
                  label="Tags de cliente"
                  value={client.tagsCliente ?? "-"}
                />
                <DetailRow
                  label="Próxima tarefa"
                  value={
                    client.proximaTarefa
                      ? `${client.proximaTarefa} · ${formatDate(client.dataTarefa ?? null)}`
                      : "-"
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Follow-ups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-md border bg-muted/35 p-3">
                  <div className="text-xs text-muted-foreground">Abertos</div>
                  <div className="mt-1 text-lg font-semibold">
                    {followUpCounts.aberto}
                  </div>
                </div>
                <div className="rounded-md border bg-muted/35 p-3">
                  <div className="text-xs text-muted-foreground">Em atraso</div>
                  <div className="mt-1 text-lg font-semibold text-danger-soft-foreground">
                    {followUpCounts.vencido}
                  </div>
                </div>
                <div className="rounded-md border bg-muted/35 p-3">
                  <div className="text-xs text-muted-foreground">Concluídos</div>
                  <div className="mt-1 text-lg font-semibold text-success-foreground">
                    {followUpCounts.concluido}
                  </div>
                </div>
                <div className="rounded-md border bg-muted/35 p-3">
                  <div className="text-xs text-muted-foreground">Proximos</div>
                  <div className="mt-1 text-lg font-semibold text-primary">
                    {followUpCounts.proximo}
                  </div>
                </div>
              </div>

              {followUps.length ? (
                <div className="space-y-2">
                  {followUps.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <FollowUpBadge status={item.status} />
                          <span className="text-sm font-medium">
                            {formatDate(item.dataPrevista)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {item.observacao}
                        </p>
                      </div>
                      {item.status === "concluido" ? (
                        <CheckCircle2 className="h-4 w-4 text-success-foreground" />
                      ) : (
                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Sem follow-ups"
                  description="Registre uma interação com próximo follow-up para criar uma pendência local."
                />
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de interações</CardTitle>
          </CardHeader>
          <CardContent>
            {interactions.length ? (
              <div className="space-y-0">
                {interactions.map((interaction) => (
                  <div
                    key={interaction.id}
                    className="relative grid gap-3 border-l pb-5 pl-5 last:pb-0"
                  >
                    <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={interaction.status} />
                        <Badge variant="outline">
                          {channelLabels[interaction.canal]}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(interaction.criadoEm)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">
                      {interaction.observacao ?? "Sem observação registrada."}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {interaction.valorRecuperado ? (
                        <span>
                          Valor recuperado:{" "}
                          {currencyFormatter.format(interaction.valorRecuperado)}
                        </span>
                      ) : null}
                      {interaction.proximoFollowUp ? (
                        <span>
                          Próximo follow-up:{" "}
                          {formatDate(interaction.proximoFollowUp)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhuma interação registrada"
                description="Use Registrar contato para iniciar o histórico comercial deste cliente."
              />
            )}
          </CardContent>
        </Card>

        <PointEventsCard events={pointEvents} />
      </div>

      {drawerOpen ? (
        <InteractionDrawer
          key={`${client.id}-${client.status}`}
          client={client}
          interactions={interactions}
          onClose={() => setDrawerOpen(false)}
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
