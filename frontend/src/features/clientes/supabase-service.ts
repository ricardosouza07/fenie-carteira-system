import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthenticatedSupabaseClient } from "@/features/auth/access";
import type {
  CarteiraClient,
  CarteiraInteraction,
  ContactChannel,
  ContactStatus,
  FinancialStatus,
  WorkStatus,
} from "@/features/carteira/types";
import { calculateClientHealthStatus } from "@/features/carteira/operational-rules";
import { normalizeFinancialStatus } from "@/features/carteira/financial-status";
import { getCurrentPeriod } from "@/lib/current-period";

import type {
  ClienteDetailFollowUp,
  ClienteDetailPointEvent,
  LoadClienteDetailResult,
} from "./types";

type SupabaseServiceClient = SupabaseClient;
type Row = Record<string, unknown>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TODAY = getCurrentPeriod().date;

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

function unavailableResult(): LoadClienteDetailResult {
  return {
    status: "unconfigured",
    client: null,
    interactions: [],
    followUps: [],
    pointEvents: [],
    message:
      "Supabase ainda não está configurado. O detalhe está usando o fallback local/mock.",
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

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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

function workStatus(value: unknown): WorkStatus {
  return value === "contatado" ||
    value === "aguardando" ||
    value === "convertido" ||
    value === "visita" ||
    value === "nao_trabalhado"
    ? value
    : "nao_trabalhado";
}

function contactStatus(value: unknown): ContactStatus | null {
  return value === "contatado" ||
    value === "aguardando" ||
    value === "convertido" ||
    value === "visita"
    ? value
    : null;
}

function channel(value: unknown): ContactChannel {
  return value === "whatsapp" ||
    value === "telefone" ||
    value === "email" ||
    value === "presencial"
    ? value
    : "telefone";
}

function customerType(value: unknown): CarteiraInteraction["tipo"] {
  return value === "externo" ||
    value === "novo" ||
    value === "espontaneo" ||
    value === "loja"
    ? value
    : "loja";
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

function formatInteractionAction(interaction: Row) {
  const status = contactStatus(interaction.work_status ?? interaction.status);
  const canal = channel(interaction.channel);

  if (!status) {
    return "Interação registrada";
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
    tipo: customerType(row.customer_type),
    canal: channel(row.channel),
    observacao: stringOrNull(row.notes) ?? stringOrNull(row.note),
    valorRecuperado: numberOrNull(row.recovered_value),
    proximoFollowUp: dateOnly(row.next_follow_up_at),
    criadoEm: String(row.interaction_at ?? row.created_at),
  };
}

function buildLastAction(customer: Row, latestInteraction: Row | null) {
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

  return { tipo: "Sem ação registrada", data: null };
}

function normalizeClient(input: {
  customer: Row;
  contacts: Row[];
  item: Row | null;
  salesperson: Row | null;
  latestInteraction: Row | null;
}): CarteiraClient {
  const { customer, contacts, item, salesperson, latestInteraction } = input;
  const interaction = latestInteraction ? mapInteraction(latestInteraction) : null;
  const nomeFantasia = stringOrNull(customer.trade_name);
  const razaoSocial = stringOrNull(customer.legal_name);
  const vendedor =
    stringOrNull(salesperson?.name) ??
    stringOrNull(customer.last_order_salesperson_name) ??
    "Sem vendedor";
  const diasSemComprar = integerOrZero(
    item?.days_without_buying ?? customer.days_without_buying,
  );

  return {
    id: String(customer.id),
    portfolioItemId: stringOrNull(item?.id) ?? undefined,
    vendedorId:
      stringOrNull(item?.salesperson_id) ??
      stringOrNull(customer.assigned_salesperson_id) ??
      undefined,
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
    proximaCompra: dateOnly(item?.next_purchase_date ?? customer.next_purchase_date),
    ultimoPedidoNumero: stringOrNull(customer.last_order_number) ?? undefined,
    ultimoPedido: dateOnly(item?.last_order_date ?? customer.last_order_date),
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
    status:
      interaction?.status ?? workStatus(item?.work_status ?? customer.work_status),
    ultimaAcao: buildLastAction(customer, latestInteraction),
    interacoes: interaction ? [interaction] : undefined,
  };
}

function normalizeFollowUp(row: Row): ClienteDetailFollowUp {
  const dueDate = dateOnly(row.due_at) ?? TODAY;
  const rawStatus = row.status;
  const status =
    rawStatus === "concluido"
      ? "concluido"
      : rawStatus === "vencido" || dueDate < TODAY
        ? "vencido"
        : "aberto";

  return {
    id: String(row.id),
    status,
    dataPrevista: dueDate,
    observacao:
      stringOrNull(row.notes) ??
      stringOrNull(row.reason) ??
      "Follow-up registrado para este cliente.",
    origem: stringOrNull(row.source),
  };
}

function normalizePointEvent(row: Row): ClienteDetailPointEvent {
  return {
    id: String(row.id),
    acao: String(row.action ?? "acao"),
    pontos: integerOrZero(row.points),
    descricao: stringOrNull(row.description) ?? "Pontuação registrada",
    data: String(row.occurred_at ?? row.created_at),
    origem: stringOrNull(row.origin) ?? "interaction",
  };
}

export async function loadClienteDetailFromSupabase(
  customerId: string,
): Promise<LoadClienteDetailResult> {
  const access = await getAuthenticatedSupabaseClient();
  const client = access.client as SupabaseServiceClient | null;

  if (!client) {
    return {
      ...unavailableResult(),
      message: access.message ?? unavailableResult().message,
    };
  }

  if (!isUuid(customerId)) {
    return {
      status: "not_found",
      client: null,
      interactions: [],
      followUps: [],
      pointEvents: [],
      message:
        "Este cliente ainda não possui ID real do Supabase. Usando fallback local, se existir.",
    };
  }

  try {
    const customer = (await expectNoError(
      client.from("customers").select("*").eq("id", customerId).maybeSingle(),
      "Não foi possível consultar o cliente",
    )) as Row | null;

    if (!customer) {
      return {
        status: "not_found",
        client: null,
        interactions: [],
        followUps: [],
        pointEvents: [],
        message:
          "Cliente não encontrado no Supabase. Usando fallback local, se existir.",
      };
    }

    const [contacts, portfolioItem, interactions, followUps, pointEvents] =
      await Promise.all([
        expectNoError(
          client
            .from("customer_contacts")
            .select("customer_id,kind,value,is_primary")
            .eq("customer_id", customerId)
            .order("is_primary", { ascending: false }),
          "Não foi possível consultar contatos do cliente",
        ),
        expectNoError(
          client
            .from("portfolio_items")
            .select("*")
            .eq("customer_id", customerId)
            .order("is_current", { ascending: false })
            .order("imported_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          "Não foi possível consultar o item da carteira",
        ),
        expectNoError(
          client
            .from("customer_interactions")
            .select(
              "id,customer_id,portfolio_item_id,status,work_status,customer_type,channel,note,notes,recovered_value,next_follow_up_at,interaction_at,created_at",
            )
            .eq("customer_id", customerId)
            .order("interaction_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false }),
          "Não foi possível consultar o histórico de interações",
        ),
        expectNoError(
          client
            .from("follow_ups")
            .select(
              "id,customer_id,interaction_id,due_at,status,reason,notes,source,completed_at,created_at",
            )
            .eq("customer_id", customerId)
            .order("due_at", { ascending: true }),
          "Não foi possível consultar follow-ups do cliente",
        ),
        expectNoError(
          client
            .from("point_events")
            .select(
              "id,customer_id,interaction_id,follow_up_id,action,points,description,origin,occurred_at,created_at",
            )
            .eq("customer_id", customerId)
            .order("occurred_at", { ascending: false }),
          "Não foi possível consultar pontos do cliente",
        ),
      ]);
    const item = portfolioItem as Row | null;
    const salespersonId =
      stringOrNull(item?.salesperson_id) ??
      stringOrNull(customer.assigned_salesperson_id);
    const salesperson = salespersonId
      ? ((await expectNoError(
          client
            .from("salespeople")
            .select("id,name")
            .eq("id", salespersonId)
            .maybeSingle(),
          "Não foi possível consultar o vendedor do cliente",
        )) as Row | null)
      : null;
    const interactionRows = asRows(interactions);
    const normalizedInteractions = interactionRows.flatMap((row) => {
      const interaction = mapInteraction(row);

      return interaction ? [interaction] : [];
    });
    const normalizedClient = normalizeClient({
      customer,
      contacts: asRows(contacts),
      item,
      salesperson,
      latestInteraction: interactionRows[0] ?? null,
    });

    return {
      status: "available",
      client: normalizedClient,
      interactions: normalizedInteractions,
      followUps: asRows(followUps).map(normalizeFollowUp),
      pointEvents: asRows(pointEvents).map(normalizePointEvent),
    };
  } catch (error) {
    return {
      status: "error",
      client: null,
      interactions: [],
      followUps: [],
      pointEvents: [],
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o detalhe do cliente no Supabase.",
    };
  }
}

export type UpdateClienteFinancialStatusResult =
  | {
      status: "success";
      situacaoFinanceira: FinancialStatus;
      observacaoFinanceira: string | null;
      message?: string;
    }
  | {
      status: "local_fallback" | "error";
      message: string;
    };

export async function updateClienteFinancialStatus(input: {
  customerId: string;
  situacaoFinanceira: FinancialStatus;
  observacaoFinanceira: string | null;
}): Promise<UpdateClienteFinancialStatusResult> {
  const access = await getAuthenticatedSupabaseClient();
  const client = access.client as SupabaseServiceClient | null;

  if (!client) {
    return {
      status: "local_fallback",
      message:
        access.message ??
        "Supabase ainda não está configurado. A situação financeira foi mantida apenas localmente.",
    };
  }

  if (!isUuid(input.customerId)) {
    return {
      status: "local_fallback",
      message:
        "Este cliente ainda não possui ID real do Supabase. A situação financeira foi mantida apenas localmente.",
    };
  }

  try {
    const status = normalizeFinancialStatus(input.situacaoFinanceira);
    const note = stringOrNull(input.observacaoFinanceira);

    await expectNoError(
      client
        .from("customers")
        .update({
          financial_status: status,
          financial_note: note,
        })
        .eq("id", input.customerId),
      "Não foi possível atualizar a situação financeira do cliente",
    );

    return {
      status: "success",
      situacaoFinanceira: status,
      observacaoFinanceira: note,
      message: "Situação financeira atualizada.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a situação financeira.",
    };
  }
}
