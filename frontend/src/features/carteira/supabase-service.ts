import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthenticatedSupabaseClient } from "@/features/auth/access";
import { calculateClientHealthStatus } from "@/features/carteira/operational-rules";

import { normalizeFinancialStatus } from "./financial-status";
import type {
  LoadCarteiraSupabaseResult,
  CarteiraSupabaseImportInfo,
} from "./server-types";
import type {
  CarteiraClient,
  CarteiraInteraction,
  ContactChannel,
  ContactStatus,
  WorkStatus,
} from "./types";

type SupabaseServiceClient = SupabaseClient;
type Row = Record<string, unknown>;

const ID_QUERY_CHUNK_SIZE = 100;
const ROW_QUERY_PAGE_SIZE = 500;

const monthStart = new Date();
monthStart.setDate(1);
monthStart.setHours(0, 0, 0, 0);

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

function unavailableResult(): LoadCarteiraSupabaseResult {
  return {
    status: "unconfigured",
    clients: [],
    importacao: null,
    message:
      "Supabase ainda não está configurado. A Carteira está usando o fallback local/mock.",
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
  const chunks: string[][] = [];

  for (let index = 0; index < ids.length; index += ID_QUERY_CHUNK_SIZE) {
    chunks.push(ids.slice(index, index + ID_QUERY_CHUNK_SIZE));
  }

  const results = await Promise.all(
    chunks.map((chunk, index) =>
      expectNoError(
        buildQuery(chunk),
        `${context} (lote ${index + 1}/${chunks.length})`,
      ),
    ),
  );

  return results.flatMap(asRows);
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

  return { tipo: "Sem ação registrada", data: null };
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
    cep: stringOrNull(customer.zip_code) ?? undefined,
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

async function latestPublishedImport(client: SupabaseServiceClient) {
  const imports = await expectNoError(
    client
      .from("portfolio_imports")
      .select("id,file_name,published_at,total_rows")
      .eq("status", "publicada")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1),
    "Não foi possível consultar a última importação publicada",
  );

  return asRows(imports)[0] ?? null;
}

export async function loadCarteiraFromSupabase(): Promise<LoadCarteiraSupabaseResult> {
  const access = await getAuthenticatedSupabaseClient();
  const client = access.client as SupabaseServiceClient | null;

  if (!client) {
    return {
      ...unavailableResult(),
      message: access.message ?? unavailableResult().message,
    };
  }

  try {
    const importRow = await latestPublishedImport(client);

    if (!importRow) {
      return {
        status: "empty",
        clients: [],
        importacao: null,
        message:
          "Nenhuma importação publicada foi encontrada no Supabase. A Carteira está usando o fallback local/mock.",
      };
    }

    const importId = String(importRow.id);
    const items = await queryAllRowsPaged(
      (from, to) =>
        client
          .from("portfolio_items")
          .select(
            "id,customer_id,salesperson_id,health_status,work_status,days_without_buying,next_purchase_date,last_order_date",
          )
          .eq("import_id", importId)
          .eq("is_current", true)
          .order("days_without_buying", { ascending: false })
          .range(from, to),
      "Não foi possível consultar os itens da carteira",
    );

    const customerIds = Array.from(
      new Set(items.map((item) => stringOrNull(item.customer_id)).filter(Boolean)),
    ) as string[];
    const salespersonIds = Array.from(
      new Set(
        items.map((item) => stringOrNull(item.salesperson_id)).filter(Boolean),
      ),
    ) as string[];

    if (customerIds.length === 0) {
      const importacao: CarteiraSupabaseImportInfo = {
        id: importId,
        arquivo: String(importRow.file_name ?? "importacao.xlsx"),
        publicadoEm: dateOnly(importRow.published_at),
        totalClientes: 0,
      };

      return {
        status: "available",
        clients: [],
        importacao,
        message: "A última importação publicada não possui clientes atuais.",
      };
    }

    const [customers, contacts, salespeople, interactions, followUps] =
      await Promise.all([
        queryRowsInChunks(
          customerIds,
          (ids) => client.from("customers").select("*").in("id", ids),
          "Não foi possível consultar clientes da carteira",
        ),
        queryRowsInChunks(
          customerIds,
          (ids) =>
            client
              .from("customer_contacts")
              .select("customer_id,kind,value,is_primary")
              .in("customer_id", ids)
              .order("is_primary", { ascending: false }),
          "Não foi possível consultar contatos dos clientes",
        ),
        salespersonIds.length
          ? expectNoError(
              client.from("salespeople").select("id,name").in("id", salespersonIds),
              "Não foi possível consultar vendedores da carteira",
            )
          : Promise.resolve([]),
        queryRowsInChunks(
          customerIds,
          (ids) =>
            client
              .from("customer_interactions")
              .select(
                "id,customer_id,portfolio_item_id,status,work_status,customer_type,channel,note,notes,recovered_value,next_follow_up_at,interaction_at,created_at",
              )
              .in("customer_id", ids)
              .gte("created_at", monthStart.toISOString())
              .order("created_at", { ascending: false }),
          "Não foi possível consultar interações do mês",
        ),
        queryRowsInChunks(
          customerIds,
          (ids) =>
            client
              .from("follow_ups")
              .select("id,customer_id,due_at,status,reason")
              .in("customer_id", ids)
              .eq("status", "aberto")
              .order("due_at", { ascending: true }),
          "Não foi possível consultar follow-ups abertos",
        ),
      ]);

    const customersById = firstByKey(asRows(customers), "id");
    const salespeopleById = firstByKey(asRows(salespeople), "id");
    const latestInteractionByCustomer = firstByKey(asRows(interactions), "customer_id");
    const nextFollowUpByCustomer = firstByKey(asRows(followUps), "customer_id");
    const contactsByCustomer = new Map<string, Row[]>();

    for (const contact of asRows(contacts)) {
      const customerId = stringOrNull(contact.customer_id);

      if (!customerId) {
        continue;
      }

      contactsByCustomer.set(customerId, [
        ...(contactsByCustomer.get(customerId) ?? []),
        contact,
      ]);
    }

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
          latestInteraction:
            latestInteractionByCustomer.get(customerId) ?? null,
          nextFollowUp: nextFollowUpByCustomer.get(customerId) ?? null,
        }),
      ];
    });

    return {
      status: "available",
      clients,
      importacao: {
        id: importId,
        arquivo: String(importRow.file_name ?? "importacao.xlsx"),
        publicadoEm: dateOnly(importRow.published_at),
        totalClientes: clients.length,
      },
    };
  } catch (error) {
    return {
      status: "error",
      clients: [],
      importacao: null,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a Carteira no Supabase.",
    };
  }
}
