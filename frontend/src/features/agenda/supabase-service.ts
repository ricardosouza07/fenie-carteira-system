import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthenticatedSupabaseClient } from "@/features/auth/access";
import type {
  CarteiraClient,
  WorkStatus,
} from "@/features/carteira/types";
import {
  calculateClientHealthStatus,
  getOperationalClientLevel,
  isClientConverted,
} from "@/features/carteira/operational-rules";
import { normalizeFinancialStatus } from "@/features/carteira/financial-status";
import {
  isClientInActivePortfolio,
  normalizePortfolioStatus,
} from "@/features/carteira/portfolio-status";
import { addDaysToDateKey, getCurrentPeriod } from "@/lib/current-period";

import type {
  AgendaGroupKey,
  AgendaItem,
  AgendaMutationResult,
  CompleteFollowUpInput,
  LoadAgendaResult,
  RescheduleFollowUpInput,
} from "./types";

type SupabaseServiceClient = SupabaseClient;
type Row = Record<string, unknown>;

const ID_QUERY_CHUNK_SIZE = 100;
const ROW_QUERY_PAGE_SIZE = 500;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TODAY = getCurrentPeriod().date;
const WEEK_LIMIT = addDaysToDateKey(TODAY, 7);

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

async function queryRowsInChunks(
  ids: string[],
  buildQuery: (
    chunk: string[],
  ) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>,
  context: string,
) {
  const results: Row[] = [];

  for (let index = 0; index < ids.length; index += ID_QUERY_CHUNK_SIZE) {
    const chunk = ids.slice(index, index + ID_QUERY_CHUNK_SIZE);
    const rows = asRows(
      await expectNoError(
        buildQuery(chunk),
        `${context} (lote ${Math.floor(index / ID_QUERY_CHUNK_SIZE) + 1})`,
      ),
    );

    results.push(...rows);
  }

  return results;
}

async function queryAllRowsPaged(
  buildQuery: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: unknown;
    error: { message: string } | null;
  }>,
  context: string,
) {
  const rows: Row[] = [];

  for (let from = 0; ; from += ROW_QUERY_PAGE_SIZE) {
    const page = asRows(
      await expectNoError(
        buildQuery(from, from + ROW_QUERY_PAGE_SIZE - 1),
        `${context} (página ${Math.floor(from / ROW_QUERY_PAGE_SIZE) + 1})`,
      ),
    );

    rows.push(...page);

    if (page.length < ROW_QUERY_PAGE_SIZE) {
      return rows;
    }
  }
}

function unavailableResult(): LoadAgendaResult {
  return {
    status: "unconfigured",
    clients: [],
    items: [],
    message:
      "Supabase ainda não está configurado. A agenda está usando o fallback local/mock.",
  };
}

function localFallback(message: string): AgendaMutationResult {
  return {
    status: "local_fallback",
    message,
  };
}

function isUuid(value: string | undefined) {
  return Boolean(value && UUID_PATTERN.test(value));
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

function workStatus(value: unknown): WorkStatus {
  return value === "contatado" ||
    value === "aguardando" ||
    value === "convertido" ||
    value === "visita" ||
    value === "nao_trabalhado"
    ? value
    : "nao_trabalhado";
}

function getDateGroup(date: string): AgendaGroupKey | null {
  if (date < TODAY) {
    return "recompra";
  }

  if (date === TODAY) {
    return "hoje";
  }

  if (date <= WEEK_LIMIT) {
    return "proximos_7";
  }

  return null;
}

function getStatusGroup(status: WorkStatus) {
  if (status === "aguardando") {
    return "aguardando" as const;
  }

  if (status === "visita") {
    return "visitas" as const;
  }

  return null;
}

function toDueTimestamp(date: string) {
  return new Date(`${date}T12:00:00.000Z`).toISOString();
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

function normalizeClient(input: {
  customer: Row;
  contacts: Row[];
  item: Row | null;
  salesperson: Row | null;
}): CarteiraClient {
  const { customer, contacts, item, salesperson } = input;
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
    email: stringOrNull(customer.email) ?? undefined,
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
    situacaoCarteira: normalizePortfolioStatus(customer.portfolio_status),
    observacaoCarteira: stringOrNull(customer.portfolio_status_note),
    status: workStatus(item?.work_status ?? customer.work_status),
    ultimaAcao: {
      tipo: stringOrNull(customer.last_action_label) ?? "Sem ação registrada",
      data: dateOnly(customer.last_action_at),
    },
  };
}

function normalizeFollowUpItem(row: Row, client: CarteiraClient): AgendaItem | null {
  const dueDate = dateOnly(row.due_at);

  if (!dueDate) {
    return null;
  }

  const group = getDateGroup(dueDate);

  if (!group) {
    return null;
  }

  const storedStatus = stringOrNull(row.status);
  const reason =
    stringOrNull(row.notes) ??
    stringOrNull(row.reason) ??
    "Follow-up aberto";

  return {
    id: `follow-up-${row.id}`,
    clienteId: client.id,
    followUpId: String(row.id),
    source: "follow_up",
    group,
    cliente: client,
    motivo:
      storedStatus === "vencido" || dueDate < TODAY
        ? `Follow-up em atraso: ${reason}`
        : reason,
    prazo: dueDate,
    status: client.status,
    classificacao: getOperationalClientLevel(client, TODAY) ?? client.nivel,
    canComplete: true,
  };
}

function normalizeStatusItem(client: CarteiraClient): AgendaItem | null {
  const group = getStatusGroup(client.status);

  if (!group) {
    return null;
  }

  return {
    id: `status-${client.id}`,
    clienteId: client.id,
    source: "status",
    group,
    cliente: client,
    motivo:
      client.status === "visita"
        ? "Visita encaminhada para acompanhamento"
        : "Aguardando retorno do cliente",
    prazo: client.proximaCompra ?? TODAY,
    status: client.status,
    classificacao: getOperationalClientLevel(client, TODAY) ?? client.nivel,
  };
}

function normalizeNextPurchaseItem(client: CarteiraClient): AgendaItem | null {
  if (
    !client.proximaCompra ||
    getStatusGroup(client.status) ||
    isClientConverted(client, TODAY)
  ) {
    return null;
  }

  const group = getDateGroup(client.proximaCompra);

  if (!group) {
    return null;
  }

  return {
    id: `proxima-${client.id}`,
    clienteId: client.id,
    source: "proxima_compra",
    group,
    cliente: client,
    motivo: client.proximaCompra < TODAY ? "Recompra prevista" : "Próxima compra prevista",
    prazo: client.proximaCompra,
    status: client.status,
    classificacao: getOperationalClientLevel(client, TODAY) ?? client.nivel,
  };
}

function sortAgendaItems(items: AgendaItem[]) {
  return [...items].sort((first, second) => {
    if (first.prazo === second.prazo) {
      return first.cliente.cliente.localeCompare(second.cliente.cliente, "pt-BR");
    }

    return first.prazo.localeCompare(second.prazo);
  });
}

export async function loadAgendaFromSupabase(): Promise<LoadAgendaResult> {
  const access = await getAuthenticatedSupabaseClient();
  const client = access.client as SupabaseServiceClient | null;

  if (!client) {
    return {
      ...unavailableResult(),
      message: access.message ?? unavailableResult().message,
    };
  }

  try {
    const [portfolioItems, followUps] = await Promise.all([
      queryAllRowsPaged(
        (from, to) =>
        client
          .from("portfolio_items")
          .select("*")
          .eq("is_current", true)
          .order("imported_at", { ascending: false })
          .range(from, to),
        "Não foi possível consultar a carteira atual",
      ),
      queryAllRowsPaged(
        (from, to) =>
        client
          .from("follow_ups")
          .select(
            "id,customer_id,interaction_id,salesperson_id,assigned_to,due_at,status,reason,notes,source,created_at",
          )
          .in("status", ["aberto", "vencido"])
          .order("due_at", { ascending: true })
          .range(from, to),
        "Não foi possível consultar follow-ups",
      ),
    ]);
    const itemRows = asRows(portfolioItems);
    const followUpRows = asRows(followUps);
    const customerIds = Array.from(
      new Set(
        [...itemRows, ...followUpRows]
          .map((row) => stringOrNull(row.customer_id))
          .filter(Boolean),
      ),
    ) as string[];

    if (customerIds.length === 0) {
      return {
        status: "empty",
        clients: [],
        items: [],
        message:
          "Nenhum cliente atual foi encontrado no Supabase. A agenda está usando o fallback local/mock.",
      };
    }

    const salespersonIdsFromItems = itemRows
      .map((row) => stringOrNull(row.salesperson_id))
      .filter(Boolean);
    const salespersonIdsFromFollowUps = followUpRows
      .flatMap((row) => [
        stringOrNull(row.assigned_to),
        stringOrNull(row.salesperson_id),
      ])
      .filter(Boolean);
    const salespersonIds = Array.from(
      new Set([...salespersonIdsFromItems, ...salespersonIdsFromFollowUps]),
    ) as string[];
    const [customers, contacts, salespeople] = await Promise.all([
      queryRowsInChunks(
        customerIds,
        (ids) => client.from("customers").select("*").in("id", ids),
        "Não foi possível consultar clientes da agenda",
      ),
      queryRowsInChunks(
        customerIds,
        (ids) =>
          client
            .from("customer_contacts")
            .select("customer_id,kind,value,is_primary")
            .in("customer_id", ids)
            .order("is_primary", { ascending: false }),
        "Não foi possível consultar contatos da agenda",
      ),
      salespersonIds.length
        ? expectNoError(
            client.from("salespeople").select("id,name").in("id", salespersonIds),
            "Não foi possível consultar vendedores da agenda",
          )
        : Promise.resolve([]),
    ]);
    const customersById = firstByKey(asRows(customers), "id");
    const itemsByCustomer = firstByKey(itemRows, "customer_id");
    const contactsByCustomer = groupByKey(asRows(contacts), "customer_id");
    const salespeopleById = firstByKey(asRows(salespeople), "id");
    const clients = customerIds.flatMap((customerId) => {
      const customer = customersById.get(customerId);

      if (!customer) {
        return [];
      }

      const item = itemsByCustomer.get(customerId) ?? null;
      const salespersonId =
        stringOrNull(item?.salesperson_id) ??
        stringOrNull(customer.assigned_salesperson_id);

      return [
        normalizeClient({
          customer,
          contacts: contactsByCustomer.get(customerId) ?? [],
          item,
          salesperson: salespersonId
            ? salespeopleById.get(salespersonId) ?? null
            : null,
        }),
      ];
    });
    const activeClients = clients.filter(isClientInActivePortfolio);
    const clientsById = new Map(
      activeClients.map((agendaClient) => [agendaClient.id, agendaClient]),
    );
    const followUpItems = followUpRows.flatMap((row) => {
      const customerId = stringOrNull(row.customer_id);
      const agendaClient = customerId ? clientsById.get(customerId) : null;

      if (!agendaClient) {
        return [];
      }

      const item = normalizeFollowUpItem(row, agendaClient);

      return item ? [item] : [];
    });
    const statusItems = activeClients.flatMap((agendaClient) => {
      const item = normalizeStatusItem(agendaClient);

      return item ? [item] : [];
    });
    const nextPurchaseItems = activeClients.flatMap((agendaClient) => {
      const item = normalizeNextPurchaseItem(agendaClient);

      return item ? [item] : [];
    });

    return {
      status: "available",
      clients: activeClients,
      items: sortAgendaItems([
        ...followUpItems,
        ...statusItems,
        ...nextPurchaseItems,
      ]),
    };
  } catch (error) {
    return {
      status: "error",
      clients: [],
      items: [],
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a agenda no Supabase.",
    };
  }
}

export async function rescheduleAgendaFollowUp(
  input: RescheduleFollowUpInput,
): Promise<AgendaMutationResult> {
  const access = await getAuthenticatedSupabaseClient();
  const client = access.client as SupabaseServiceClient | null;

  if (!client) {
    return localFallback(
      access.message ?? "Supabase nao esta configurado. O reagendamento ficou local/mock.",
    );
  }

  if (!isUuid(input.followUpId)) {
    return localFallback(
      "Este item não possui follow-up real no Supabase. O reagendamento ficou local/mock.",
    );
  }

  try {
    await expectNoError(
      client
        .from("follow_ups")
        .update({
          due_at: toDueTimestamp(input.dueDate),
          status: input.dueDate < TODAY ? "vencido" : "aberto",
        })
        .eq("id", input.followUpId),
      "Não foi possível reagendar o follow-up",
    );

    return {
      status: "saved",
      message: "Follow-up reagendado no Supabase.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível reagendar o follow-up.",
    };
  }
}

export async function completeAgendaFollowUp(
  input: CompleteFollowUpInput,
): Promise<AgendaMutationResult> {
  const access = await getAuthenticatedSupabaseClient();
  const client = access.client as SupabaseServiceClient | null;

  if (!client) {
    return localFallback(
      access.message ?? "Supabase nao esta configurado. A conclusao ficou local/mock.",
    );
  }

  if (!isUuid(input.followUpId)) {
    return localFallback(
      "Este item não possui follow-up real no Supabase. A conclusão ficou local/mock.",
    );
  }

  try {
    await expectNoError(
      client
        .from("follow_ups")
        .update({
          status: "concluido",
          completed_at: new Date().toISOString(),
        })
        .eq("id", input.followUpId),
      "Não foi possível concluir o follow-up",
    );

    return {
      status: "saved",
      message: "Follow-up concluído no Supabase.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível concluir o follow-up.",
    };
  }
}
