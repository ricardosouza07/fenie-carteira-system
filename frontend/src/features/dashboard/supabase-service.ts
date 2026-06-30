import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthenticatedSupabaseClient } from "@/features/auth/access";
import {
  fetchAllPages,
  fetchByIdBatches,
} from "@/lib/supabase/query-helpers";
import type {
  CarteiraClient,
  CarteiraInteraction,
  ContactChannel,
  ContactStatus,
  WorkStatus,
} from "@/features/carteira/types";
import {
  buildMonthlyGamificationSummary,
  clonePerformanceCampaign,
  defaultPerformanceCampaign,
  pointRules,
} from "@/features/gamification/service";
import type {
  AchievementLevel,
  CampaignStatus,
  PointAction,
  PointEvent,
  PointEventOrigin,
} from "@/features/gamification/types";
import { getCurrentPeriod } from "@/lib/current-period";
import {
  buildOperationalCounts,
  calculateClientHealthStatus,
  isClientConverted,
  isClientInRecompra,
  isClientOldInactive,
  matchesOperationalLevel,
} from "@/features/carteira/operational-rules";
import { normalizeFinancialStatus } from "@/features/carteira/financial-status";

import type {
  DashboardMetrics,
  DashboardPriority,
  DashboardSellerPerformance,
  LoadDashboardResult,
} from "./types";

type SupabaseServiceClient = SupabaseClient;
type Row = Record<string, unknown>;

const currentPeriod = getCurrentPeriod();
const TODAY = currentPeriod.date;
const DEFAULT_MONTH = currentPeriod.month;
const DEFAULT_YEAR = currentPeriod.year;
const DEFAULT_MONTH_KEY = currentPeriod.monthKey;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro desconhecido.";
}

async function optionalMetricRows(
  load: () => Promise<Row[]>,
  metricErrors: string[],
) {
  try {
    return await load();
  } catch (error) {
    metricErrors.push(errorMessage(error));

    return [];
  }
}

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

const pointActionValues = new Set<PointAction>([
  "contatado",
  "aguardando_retorno",
  "visita_encaminhada",
  "convertido",
  "cliente_novo",
  "pedido_espontaneo",
  "reativacao_inativo_antigo",
  "follow_up_no_prazo",
]);

function unavailableResult(): LoadDashboardResult {
  return {
    status: "unconfigured",
    clients: [],
    metrics: null,
    sellerRows: [],
    priorityRows: [],
    gamificationSummary: null,
    message:
      "Supabase ainda nao esta configurado. O dashboard esta usando o fallback local/mock.",
  };
}

async function expectNoError<T>(
  operation: PromiseLike<{ data: T; error: { message: string } | null }>,
  context: string,
): Promise<NonNullable<T>> {
  const { data, error } = await operation;

  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }

  return data as NonNullable<T>;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function integerOrZero(value: unknown) {
  return Math.max(0, Math.round(numberOrZero(value)));
}

function dateOnly(value: unknown) {
  const text = stringOrNull(value);

  if (!text) {
    return null;
  }

  return text.slice(0, 10);
}

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function firstByKey(rows: Row[], key: string) {
  const map = new Map<string, Row>();

  for (const row of rows) {
    const id = stringOrNull(row[key]);

    if (id && !map.has(id)) {
      map.set(id, row);
    }
  }

  return map;
}

function groupByKey(rows: Row[], key: string) {
  const map = new Map<string, Row[]>();

  for (const row of rows) {
    const id = stringOrNull(row[key]);

    if (!id) {
      continue;
    }

    map.set(id, [...(map.get(id) ?? []), row]);
  }

  return map;
}

function uniqueCount(values: Array<string | null | undefined>) {
  return new Set(values.filter(Boolean)).size;
}

function contactStatus(value: unknown): ContactStatus | null {
  return value === "contatado" ||
    value === "aguardando" ||
    value === "convertido" ||
    value === "visita"
    ? value
    : null;
}

function workStatus(value: unknown): WorkStatus {
  return value === "contatado" ||
    value === "aguardando" ||
    value === "convertido" ||
    value === "visita" ||
    value === "nao_trabalhado"
    ? value
    : "nao_trabalhado";
}

function channel(value: unknown): ContactChannel {
  return value === "whatsapp" ||
    value === "telefone" ||
    value === "email" ||
    value === "presencial"
    ? value
    : "telefone";
}

function pointAction(value: unknown): PointAction | null {
  return typeof value === "string" && pointActionValues.has(value as PointAction)
    ? (value as PointAction)
    : null;
}

function pointOrigin(value: unknown): PointEventOrigin {
  if (
    value === "mock_seed" ||
    value === "interaction_drawer" ||
    value === "agenda_follow_up" ||
    value === "interaction"
  ) {
    return value;
  }

  return "interaction";
}

function formatInteractionAction(interaction: Row) {
  const status = contactStatus(interaction.work_status ?? interaction.status);
  const canal = channel(interaction.channel);

  if (!status) {
    return "Interacao registrada";
  }

  return `${statusActionLabels[status]} via ${channelLabels[canal]}`;
}

function mapInteraction(row: Row): CarteiraInteraction | null {
  const status = contactStatus(row.work_status ?? row.status);

  if (!status) {
    return null;
  }

  return {
    id: String(row.id),
    clienteId: String(row.customer_id),
    status,
    tipo:
      row.customer_type === "externo" ||
      row.customer_type === "novo" ||
      row.customer_type === "espontaneo"
        ? row.customer_type
        : "loja",
    canal: channel(row.channel),
    observacao: stringOrNull(row.notes) ?? stringOrNull(row.note),
    valorRecuperado:
      typeof row.recovered_value === "number" ? row.recovered_value : null,
    proximoFollowUp: dateOnly(row.next_follow_up_at),
    criadoEm: String(row.interaction_at ?? row.created_at),
  };
}

function pickPhone(customer: Row, contacts: Row[]) {
  const fromCustomer = stringOrNull(customer.phone_primary);

  if (fromCustomer) {
    return fromCustomer;
  }

  const contact = contacts.find(
    (item) => item.kind === "telefone" || item.kind === "whatsapp",
  );

  return stringOrNull(contact?.value) ?? "-";
}

function pickEmail(customer: Row, contacts: Row[]) {
  const fromCustomer = stringOrNull(customer.email);

  if (fromCustomer) {
    return fromCustomer;
  }

  const contact = contacts.find((item) => item.kind === "email");

  return stringOrNull(contact?.value) ?? undefined;
}

function buildLastAction(
  customer: Row,
  latestInteraction: Row | null,
  nextFollowUp: Row | null,
) {
  if (latestInteraction) {
    return {
      tipo: formatInteractionAction(latestInteraction),
      data: dateOnly(
        latestInteraction.interaction_at ?? latestInteraction.created_at,
      ),
    };
  }

  const customerAction = stringOrNull(customer.last_action_label);

  if (customerAction) {
    return {
      tipo: customerAction,
      data: dateOnly(customer.last_action_at),
    };
  }

  if (nextFollowUp) {
    return {
      tipo: "Follow-up aberto",
      data: dateOnly(nextFollowUp.due_at),
    };
  }

  return { tipo: "Sem acao registrada", data: null };
}

function normalizeClient(input: {
  item: Row;
  customer: Row;
  contacts: Row[];
  salesperson: Row | null;
  latestInteraction: Row | null;
  nextFollowUp: Row | null;
}): CarteiraClient {
  const { item, customer, contacts, salesperson, latestInteraction, nextFollowUp } =
    input;
  const interaction = latestInteraction ? mapInteraction(latestInteraction) : null;
  const vendedor =
    stringOrNull(salesperson?.name) ??
    stringOrNull(customer.last_order_salesperson_name) ??
    "Sem vendedor";
  const nomeFantasia = stringOrNull(customer.trade_name);
  const razaoSocial = stringOrNull(customer.legal_name);
  const diasSemComprar = integerOrZero(
    item.days_without_buying ?? customer.days_without_buying,
  );

  return {
    id: String(customer.id),
    portfolioItemId: stringOrNull(item.id) ?? undefined,
    vendedorId: stringOrNull(item.salesperson_id) ?? undefined,
    nivel: calculateClientHealthStatus(diasSemComprar),
    cliente: nomeFantasia ?? razaoSocial ?? "Cliente sem nome",
    razaoSocial: razaoSocial ?? undefined,
    nomeFantasia: nomeFantasia ?? undefined,
    documento: stringOrNull(customer.document) ?? undefined,
    inscricaoEstadual: stringOrNull(customer.state_registration) ?? undefined,
    email: pickEmail(customer, contacts),
    telefone: pickPhone(customer, contacts),
    cidade: stringOrNull(customer.city) ?? "-",
    bairro: stringOrNull(customer.district) ?? "-",
    endereco: stringOrNull(customer.address) ?? undefined,
    diasSemComprar,
    cicloMedioCompraDias:
      typeof customer.average_purchase_cycle_days === "number"
        ? customer.average_purchase_cycle_days
        : undefined,
    proximaCompra: dateOnly(item.next_purchase_date ?? customer.next_purchase_date),
    ultimoPedidoNumero: stringOrNull(customer.last_order_number) ?? undefined,
    ultimoPedido: dateOnly(item.last_order_date ?? customer.last_order_date),
    valorUltimoPedido: numberOrZero(customer.last_order_value),
    vendedor,
    vendedorUltimoPedido:
      stringOrNull(customer.last_order_salesperson_name) ?? vendedor,
    situacaoOriginal:
      stringOrNull(customer.mercos_situation) ??
      stringOrNull(customer.original_situation) ??
      undefined,
    dataCadastro: dateOnly(customer.registration_date),
    origemCadastro: stringOrNull(customer.registration_origin) ?? undefined,
    acessoB2B: stringOrNull(customer.b2b_access) ?? undefined,
    segmento: stringOrNull(customer.segment) ?? undefined,
    tagsCliente: stringOrNull(customer.customer_tags) ?? undefined,
    proximaTarefa: stringOrNull(customer.next_task) ?? undefined,
    dataTarefa: dateOnly(customer.task_date),
    situacaoFinanceira: normalizeFinancialStatus(customer.financial_status),
    observacaoFinanceira: stringOrNull(customer.financial_note),
    status: interaction?.status ?? workStatus(item.work_status ?? customer.work_status),
    ultimaAcao: buildLastAction(customer, latestInteraction, nextFollowUp),
    interacoes: interaction ? [interaction] : undefined,
  };
}

function monthRange(month: string, year: string) {
  const start = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  const end = new Date(Date.UTC(Number(year), Number(month), 1));

  return {
    monthKey: `${year}-${month}`,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    startDate: start.toISOString().slice(0, 10),
    endDate: new Date(end.getTime() - 86400000).toISOString().slice(0, 10),
  };
}

function isFollowUpOpen(row: Row) {
  return row.status === "aberto" || row.status === "vencido";
}

function isFollowUpOverdue(row: Row) {
  const dueDate = dateOnly(row.due_at);

  return isFollowUpOpen(row) && Boolean(dueDate && dueDate < TODAY);
}

function isFollowUpToday(row: Row) {
  return isFollowUpOpen(row) && dateOnly(row.due_at) === TODAY;
}

function getInteractionStatus(row: Row) {
  return contactStatus(row.work_status ?? row.status);
}

function getSellerKey(input: {
  row?: Row | null;
  client?: CarteiraClient | null;
  salespeopleById: Map<string, Row>;
}) {
  const salespersonId =
    stringOrNull(input.row?.salesperson_id) ??
    stringOrNull(input.row?.assigned_to) ??
    input.client?.vendedorId ??
    null;
  const salesperson = salespersonId
    ? input.salespeopleById.get(salespersonId)
    : null;
  const name =
    stringOrNull(salesperson?.name) ?? input.client?.vendedor ?? "Sem vendedor";

  return {
    id: salespersonId ?? name.toLowerCase(),
    name,
  };
}

type SellerAccumulator = DashboardSellerPerformance & {
  workedCustomerIds: Set<string>;
  convertedCustomerIds: Set<string>;
  visitCustomerIds: Set<string>;
};

function createSellerAccumulator(vendedor: string): SellerAccumulator {
  return {
    vendedor,
    trabalhados: 0,
    contatos: 0,
    convertidos: 0,
    taxaConversao: 0,
    visitas: 0,
    valorRecuperado: 0,
    pendencias: 0,
    followUpsEmAtraso: 0,
    pontos: 0,
    workedCustomerIds: new Set<string>(),
    convertedCustomerIds: new Set<string>(),
    visitCustomerIds: new Set<string>(),
  };
}

function buildSellerRows(input: {
  clients: CarteiraClient[];
  interactions: Row[];
  followUps: Row[];
  pointEvents: Row[];
  salespeopleById: Map<string, Row>;
}) {
  const { clients, interactions, followUps, pointEvents, salespeopleById } = input;
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const sellers = new Map<string, SellerAccumulator>();

  function getAccumulator(key: string, name: string) {
    const current = sellers.get(key) ?? createSellerAccumulator(name);

    sellers.set(key, current);

    return current;
  }

  for (const client of clients) {
    const key = getSellerKey({ client, salespeopleById });
    const current = getAccumulator(key.id, key.name);

    if (
      !isClientConverted(client, TODAY) &&
      (client.status === "aguardando" ||
        client.status === "visita" ||
        client.status === "nao_trabalhado" ||
        matchesOperationalLevel(client, "risco", TODAY) ||
        isClientInRecompra(client, TODAY))
    ) {
      current.pendencias += 1;
    }
  }

  for (const interaction of interactions) {
    const customerId = stringOrNull(interaction.customer_id);
    const client = customerId ? clientsById.get(customerId) : null;
    const key = getSellerKey({ row: interaction, client, salespeopleById });
    const current = getAccumulator(key.id, key.name);
    const status = getInteractionStatus(interaction);

    current.contatos += 1;

    if (customerId) {
      current.workedCustomerIds.add(customerId);
    }

    if (status === "convertido") {
      if (customerId) {
        current.convertedCustomerIds.add(customerId);
      }

      current.valorRecuperado += numberOrZero(interaction.recovered_value);
    }

    if (status === "visita" && customerId) {
      current.visitCustomerIds.add(customerId);
    }
  }

  for (const followUp of followUps) {
    if (!isFollowUpOverdue(followUp)) {
      continue;
    }

    const customerId = stringOrNull(followUp.customer_id);
    const client = customerId ? clientsById.get(customerId) : null;
    const key = getSellerKey({ row: followUp, client, salespeopleById });
    const current = getAccumulator(key.id, key.name);

    current.followUpsEmAtraso += 1;
  }

  for (const event of pointEvents) {
    const customerId = stringOrNull(event.customer_id);
    const client = customerId ? clientsById.get(customerId) : null;
    const key = getSellerKey({ row: event, client, salespeopleById });
    const current = getAccumulator(key.id, key.name);

    current.pontos += integerOrZero(event.points);
  }

  return Array.from(sellers.values())
    .map<DashboardSellerPerformance>((seller) => {
      const trabalhados = seller.workedCustomerIds.size;
      const convertidos = seller.convertedCustomerIds.size;

      return {
        vendedor: seller.vendedor,
        trabalhados,
        contatos: seller.contatos,
        convertidos,
        taxaConversao:
          trabalhados > 0 ? Math.round((convertidos / trabalhados) * 100) : 0,
        visitas: seller.visitCustomerIds.size,
        valorRecuperado: seller.valorRecuperado,
        pendencias: seller.pendencias + seller.followUpsEmAtraso,
        followUpsEmAtraso: seller.followUpsEmAtraso,
        pontos: seller.pontos,
      };
    })
    .sort((first, second) => {
      if (second.pontos !== first.pontos) {
        return second.pontos - first.pontos;
      }

      if (second.valorRecuperado !== first.valorRecuperado) {
        return second.valorRecuperado - first.valorRecuperado;
      }

      return second.trabalhados - first.trabalhados;
    });
}

function buildMetrics(input: {
  clients: CarteiraClient[];
  interactions: Row[];
  followUps: Row[];
  pointEvents: Row[];
}): DashboardMetrics {
  const { clients, interactions, followUps, pointEvents } = input;
  const convertedInteractions = interactions.filter(
    (interaction) => getInteractionStatus(interaction) === "convertido",
  );
  const visitInteractions = interactions.filter(
    (interaction) => getInteractionStatus(interaction) === "visita",
  );
  const operationalCounts = buildOperationalCounts(clients, TODAY);

  return {
    totalClientes: operationalCounts.totalClientes,
    saudaveis: operationalCounts.saudaveis,
    atencao: operationalCounts.atencao,
    risco: operationalCounts.risco,
    inativosAntigos: operationalCounts.inativosAntigos,
    recomprasPendentes: operationalCounts.recomprasPendentes,
    trabalhadosMes: uniqueCount(
      interactions.map((interaction) => stringOrNull(interaction.customer_id)),
    ),
    naoTrabalhados: operationalCounts.naoTrabalhados,
    convertidos: uniqueCount(
      convertedInteractions.map((interaction) =>
        stringOrNull(interaction.customer_id),
      ),
    ),
    valorRecuperado: convertedInteractions.reduce(
      (total, interaction) => total + numberOrZero(interaction.recovered_value),
      0,
    ),
    aguardandoRetorno: clients.filter((client) => client.status === "aguardando")
      .length,
    visitasEncaminhadas: Math.max(
      uniqueCount(
        visitInteractions.map((interaction) =>
          stringOrNull(interaction.customer_id),
        ),
      ),
      clients.filter((client) => client.status === "visita").length,
    ),
    followUpsEmAtraso: followUps.filter(isFollowUpOverdue).length,
    followUpsHoje: followUps.filter(isFollowUpToday).length,
    contatosRealizados: interactions.length,
    pontosMes: pointEvents.reduce(
      (total, event) => total + integerOrZero(event.points),
      0,
    ),
    clientesInadimplentes: operationalCounts.clientesInadimplentes,
    clientesBloqueados: operationalCounts.clientesBloqueados,
    negociacoesFinanceiras: operationalCounts.negociacoesFinanceiras,
  };
}

function buildPriorityRows(input: {
  clients: CarteiraClient[];
  interactionsByCustomer: Map<string, Row>;
  followUpsByCustomer: Map<string, Row[]>;
}): DashboardPriority[] {
  const { clients, interactionsByCustomer, followUpsByCustomer } = input;

  return clients
    .map<DashboardPriority | null>((client) => {
      const motives: string[] = [];
      let score = client.diasSemComprar;
      const followUps = followUpsByCustomer.get(client.id) ?? [];
      const hasCurrentMonthInteraction = interactionsByCustomer.has(client.id);
      const hasOverdueFollowUp = followUps.some(isFollowUpOverdue);

      if (isClientConverted(client, TODAY)) {
        return null;
      }

      if (hasOverdueFollowUp) {
        motives.push("Follow-up em atraso");
        score += 700;
      }

      if (isClientInRecompra(client, TODAY)) {
        motives.push("Recompra");
        score += 520;
      }

      if (
        matchesOperationalLevel(client, "risco", TODAY) &&
        !hasCurrentMonthInteraction
      ) {
        motives.push("Risco sem contato");
        score += 420;
      }

      if (isClientOldInactive(client, TODAY) && !hasCurrentMonthInteraction) {
        motives.push("Inativo antigo sem acao");
        score += 360;
      }

      if (client.status === "aguardando") {
        motives.push("Aguardando retorno");
        score += 250;
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
    .filter((item): item is DashboardPriority => Boolean(item))
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return second.client.diasSemComprar - first.client.diasSemComprar;
    })
    .slice(0, 12);
}

function mapCampaign(row: Row | null, levels: Row[]) {
  if (!row) {
    return clonePerformanceCampaign(defaultPerformanceCampaign);
  }

  const marcos: AchievementLevel[] = levels.map((level) => ({
    id: String(level.id),
    nome: stringOrNull(level.name) ?? "Marco",
    pontos: integerOrZero(level.required_points),
    premio: stringOrNull(level.prize) ?? "Premio",
    descricao: stringOrNull(level.short_description) ?? "",
    ativo: level.active !== false,
  }));
  const month = dateOnly(row.month)?.slice(0, 7) ?? DEFAULT_MONTH_KEY;
  const status: CampaignStatus = row.status === "inativa" ? "inativa" : "ativa";

  return {
    id: String(row.id),
    nome: stringOrNull(row.name) ?? defaultPerformanceCampaign.nome,
    mesAno: month,
    periodoInicial:
      dateOnly(row.starts_at) ?? defaultPerformanceCampaign.periodoInicial,
    periodoFinal: dateOnly(row.ends_at) ?? defaultPerformanceCampaign.periodoFinal,
    status,
    marcos: marcos.length > 0 ? marcos : defaultPerformanceCampaign.marcos,
    atualizadoEm: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

function mapPointEvents(input: {
  rows: Row[];
  interactionsById: Map<string, Row>;
  clientsById: Map<string, CarteiraClient>;
  salespeopleById: Map<string, Row>;
}): PointEvent[] {
  const { rows, interactionsById, clientsById, salespeopleById } = input;

  return rows.flatMap((row) => {
    const action = pointAction(row.action);
    const customerId = stringOrNull(row.customer_id);
    const salespersonId = stringOrNull(row.salesperson_id);
    const client = customerId ? clientsById.get(customerId) : null;
    const salesperson = salespersonId
      ? salespeopleById.get(salespersonId)
      : null;
    const data = dateOnly(row.occurred_at ?? row.created_at);

    if (!action || !data) {
      return [];
    }

    const interactionId = stringOrNull(row.interaction_id);
    const interaction = interactionId ? interactionsById.get(interactionId) : null;

    return [
      {
        id: String(row.id),
        vendedor:
          stringOrNull(salesperson?.name) ?? client?.vendedor ?? "Sem vendedor",
        userId: salespersonId ?? client?.vendedorId ?? client?.vendedor ?? "sem-vendedor",
        customerId: customerId ?? "",
        acao: action,
        pontos: integerOrZero(row.points) || pointRules[action],
        data,
        descricao:
          stringOrNull(row.description) ?? "Pontuacao comercial registrada",
        origem: pointOrigin(row.origin),
        valorRecuperado:
          action === "convertido"
            ? numberOrZero(interaction?.recovered_value)
            : undefined,
      },
    ];
  });
}

async function latestPublishedImport(client: SupabaseServiceClient) {
  const imports = await expectNoError(
    client
      .from("portfolio_imports")
      .select(
        "id,file_name,published_at,total_rows,valid_rows,possible_duplicates,created_at",
      )
      .eq("status", "publicada")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1),
    "Nao foi possivel consultar a ultima importacao publicada",
  );

  return asRows(imports)[0] ?? null;
}

async function activeCampaign(
  client: SupabaseServiceClient,
  range: ReturnType<typeof monthRange>,
) {
  const activeRows = asRows(
    await expectNoError(
      client
        .from("performance_campaigns")
        .select("*")
        .eq("status", "ativa")
        .lte("starts_at", TODAY)
        .gte("ends_at", TODAY)
        .order("created_at", { ascending: false })
        .limit(1),
      "Nao foi possivel consultar a campanha ativa",
    ),
  );
  let campaignRow = activeRows[0] ?? null;

  if (!campaignRow) {
    const monthRows = asRows(
      await expectNoError(
        client
          .from("performance_campaigns")
          .select("*")
          .eq("month", range.startDate)
          .order("created_at", { ascending: false })
          .limit(1),
        "Nao foi possivel consultar a campanha do mes",
      ),
    );

    campaignRow = monthRows[0] ?? null;
  }

  if (!campaignRow) {
    return clonePerformanceCampaign(defaultPerformanceCampaign);
  }

  const levels = asRows(
    await expectNoError(
      client
        .from("performance_campaign_levels")
        .select("*")
        .eq("campaign_id", String(campaignRow.id))
        .order("required_points", { ascending: true }),
      "Nao foi possivel consultar os marcos da campanha",
    ),
  );

  return mapCampaign(campaignRow, levels);
}

export async function loadDashboardFromSupabase(
  month = DEFAULT_MONTH,
  year = DEFAULT_YEAR,
): Promise<LoadDashboardResult> {
  const access = await getAuthenticatedSupabaseClient();
  const client = access.client as SupabaseServiceClient | null;

  if (!client) {
    return {
      ...unavailableResult(),
      message: access.message ?? unavailableResult().message,
    };
  }

  const range = monthRange(month, year);

  try {
    const importRow = await latestPublishedImport(client);

    if (!importRow) {
      return {
        status: "empty",
        clients: [],
        metrics: null,
        sellerRows: [],
        priorityRows: [],
        gamificationSummary: null,
        message:
          "Nenhuma importacao publicada foi encontrada no Supabase. O dashboard esta usando o fallback local/mock.",
      };
    }

    const importId = String(importRow.id);
    const metricErrors: string[] = [];
    const items = await fetchAllPages<Row>(
      (from, to) =>
        client
          .from("portfolio_items")
          .select(
            "id,customer_id,salesperson_id,health_status,work_status,days_without_buying,next_purchase_date,last_order_date,is_current,imported_at",
          )
          .eq("import_id", importId)
          .eq("is_current", true)
          .order("days_without_buying", { ascending: false })
          .range(from, to),
      "Nao foi possivel consultar os itens da carteira atual",
    );
    const customerIds = Array.from(
      new Set(items.map((item) => stringOrNull(item.customer_id)).filter(Boolean)),
    ) as string[];
    const salespersonIdsFromItems = items
      .map((item) => stringOrNull(item.salesperson_id))
      .filter(Boolean);

    if (customerIds.length === 0) {
      return {
        status: "available",
        clients: [],
        metrics: buildMetrics({
          clients: [],
          interactions: [],
          followUps: [],
          pointEvents: [],
        }),
        sellerRows: [],
        priorityRows: [],
        gamificationSummary: buildMonthlyGamificationSummary(
          [],
          range.monthKey,
          clonePerformanceCampaign(defaultPerformanceCampaign),
        ),
        message: "A ultima importacao publicada nao possui clientes atuais.",
      };
    }

    const customers = await fetchByIdBatches<Row>(
      customerIds,
      (batch, from, to) =>
        client
          .from("customers")
          .select("*")
          .in("id", batch)
          .order("id", { ascending: true })
          .range(from, to),
      "Nao foi possivel consultar clientes do dashboard",
    );
    const [contacts, interactionRows, followUpRows, pointRows] =
      await Promise.all([
        optionalMetricRows(
          () =>
            fetchByIdBatches<Row>(
              customerIds,
              (batch, from, to) =>
                client
                  .from("customer_contacts")
                  .select("customer_id,kind,value,is_primary")
                  .in("customer_id", batch)
                  .order("customer_id", { ascending: true })
                  .order("is_primary", { ascending: false })
                  .range(from, to),
              "Nao foi possivel consultar contatos do dashboard",
            ),
          metricErrors,
        ),
        optionalMetricRows(
          () =>
            fetchByIdBatches<Row>(
              customerIds,
              (batch, from, to) =>
                client
                  .from("customer_interactions")
                  .select(
                    "id,customer_id,portfolio_item_id,salesperson_id,status,work_status,customer_type,channel,note,notes,recovered_value,next_follow_up_at,interaction_at,created_at",
                  )
                  .in("customer_id", batch)
                  .gte("interaction_at", range.startIso)
                  .lt("interaction_at", range.endIso)
                  .order("interaction_at", { ascending: false })
                  .range(from, to),
              "Nao foi possivel consultar interacoes do mes",
            ),
          metricErrors,
        ),
        optionalMetricRows(
          () =>
            fetchByIdBatches<Row>(
              customerIds,
              (batch, from, to) =>
                client
                  .from("follow_ups")
                  .select(
                    "id,customer_id,interaction_id,salesperson_id,assigned_to,due_at,status,reason,notes,source,created_at",
                  )
                  .in("customer_id", batch)
                  .in("status", ["aberto", "vencido"])
                  .order("due_at", { ascending: true })
                  .range(from, to),
              "Nao foi possivel consultar follow-ups do dashboard",
            ),
          metricErrors,
        ),
        optionalMetricRows(
          () =>
            fetchAllPages<Row>(
              (from, to) =>
                client
                  .from("point_events")
                  .select(
                    "id,campaign_id,customer_id,interaction_id,follow_up_id,salesperson_id,action,points,description,origin,occurred_at,created_at",
                  )
                  .gte("occurred_at", range.startIso)
                  .lt("occurred_at", range.endIso)
                  .order("occurred_at", { ascending: false })
                  .range(from, to),
              "Nao foi possivel consultar pontos do mes",
            ),
          metricErrors,
        ),
      ]);
    const salespersonIds = Array.from(
      new Set(
        [
          ...salespersonIdsFromItems,
          ...interactionRows.map((row) => stringOrNull(row.salesperson_id)),
          ...followUpRows.flatMap((row) => [
            stringOrNull(row.salesperson_id),
            stringOrNull(row.assigned_to),
          ]),
          ...pointRows.map((row) => stringOrNull(row.salesperson_id)),
        ].filter(Boolean),
      ),
    ) as string[];
    const [salespeople, campaign] = await Promise.all([
      salespersonIds.length
        ? optionalMetricRows(
            () =>
              fetchByIdBatches<Row>(
                salespersonIds,
                (batch, from, to) =>
                  client
                    .from("salespeople")
                    .select("id,name")
                    .in("id", batch)
                    .order("id", { ascending: true })
                    .range(from, to),
                "Nao foi possivel consultar vendedores do dashboard",
              ),
            metricErrors,
          )
        : Promise.resolve([]),
      activeCampaign(client, range).catch((error) => {
        metricErrors.push(errorMessage(error));

        return clonePerformanceCampaign(defaultPerformanceCampaign);
      }),
    ]);
    const customersById = firstByKey(asRows(customers), "id");
    const contactsByCustomer = groupByKey(asRows(contacts), "customer_id");
    const salespeopleById = firstByKey(asRows(salespeople), "id");
    const latestInteractionByCustomer = firstByKey(
      interactionRows,
      "customer_id",
    );
    const followUpsByCustomer = groupByKey(followUpRows, "customer_id");
    const nextFollowUpByCustomer = firstByKey(followUpRows, "customer_id");
    const clients = items.flatMap((item) => {
      const customerId = stringOrNull(item.customer_id);
      const customer = customerId ? customersById.get(customerId) : null;

      if (!customerId || !customer) {
        return [];
      }

      return [
        normalizeClient({
          item,
          customer,
          contacts: contactsByCustomer.get(customerId) ?? [],
          salesperson: stringOrNull(item.salesperson_id)
            ? salespeopleById.get(String(item.salesperson_id)) ?? null
            : null,
          latestInteraction: latestInteractionByCustomer.get(customerId) ?? null,
          nextFollowUp: nextFollowUpByCustomer.get(customerId) ?? null,
        }),
      ];
    });
    const clientsById = new Map(clients.map((dashboardClient) => [
      dashboardClient.id,
      dashboardClient,
    ]));
    const interactionsById = firstByKey(interactionRows, "id");
    const gamificationEvents = mapPointEvents({
      rows: pointRows,
      interactionsById,
      clientsById,
      salespeopleById,
    });
    const metrics = buildMetrics({
      clients,
      interactions: interactionRows,
      followUps: followUpRows,
      pointEvents: pointRows,
    });
    const validRows = integerOrZero(importRow.valid_rows ?? importRow.total_rows);
    const consolidatedRows = Math.max(0, validRows - clients.length);
    const sourceSummary =
      consolidatedRows > 0
        ? `Dashboard carregado com ${clients.length} clientes únicos da última carteira publicada (${validRows} linhas válidas; ${consolidatedRows} duplicidades consolidadas).`
        : `Dashboard carregado com ${clients.length} clientes da última carteira publicada.`;

    return {
      status: "available",
      clients,
      metrics,
      sellerRows: buildSellerRows({
        clients,
        interactions: interactionRows,
        followUps: followUpRows,
        pointEvents: pointRows,
        salespeopleById,
      }),
      priorityRows: buildPriorityRows({
        clients,
        interactionsByCustomer: latestInteractionByCustomer,
        followUpsByCustomer,
      }),
      gamificationSummary: buildMonthlyGamificationSummary(
        gamificationEvents,
        range.monthKey,
        campaign,
      ),
      metricErrors,
      message:
        metricErrors.length > 0
          ? `${sourceSummary} Algumas métricas auxiliares apresentaram erro.`
          : sourceSummary,
    };
  } catch (error) {
    const emptyCampaign = clonePerformanceCampaign(defaultPerformanceCampaign);

    return {
      status: "error",
      clients: [],
      metrics: buildMetrics({
        clients: [],
        interactions: [],
        followUps: [],
        pointEvents: [],
      }),
      sellerRows: [],
      priorityRows: [],
      gamificationSummary: buildMonthlyGamificationSummary(
        [],
        range.monthKey,
        emptyCampaign,
      ),
      metricErrors: [errorMessage(error)],
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar o dashboard no Supabase.",
    };
  }
}
