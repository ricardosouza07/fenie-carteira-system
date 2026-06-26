import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthenticatedSupabaseClient } from "@/features/auth/access";
import type {
  CarteiraClient,
  ContactChannel,
  ContactStatus,
  WorkStatus,
} from "@/features/carteira/types";
import { calculateClientHealthStatus } from "@/features/carteira/operational-rules";
import { normalizeFinancialStatus } from "@/features/carteira/financial-status";
import { getCurrentPeriod } from "@/lib/current-period";

import type {
  ChannelLabel,
  ClientTypeLabel,
  ConvertedRow,
  FollowUpRow,
  LoadRelatoriosResult,
  PointRow,
  WorkedRow,
} from "./types";

type SupabaseServiceClient = SupabaseClient;
type Row = Record<string, unknown>;

const ID_QUERY_CHUNK_SIZE = 100;
const ROW_QUERY_PAGE_SIZE = 500;
const TODAY = getCurrentPeriod().date;

const statusActionLabels: Record<ContactStatus, string> = {
  contatado: "Contato registrado",
  aguardando: "Aguardando retorno",
  convertido: "Conversao registrada",
  visita: "Visita encaminhada",
};

const channelLabels: Record<ContactChannel, ChannelLabel> = {
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  email: "E-mail",
  presencial: "Presencial",
};

const customerTypeLabels: Record<string, ClientTypeLabel> = {
  loja: "Loja",
  externo: "Externo",
  novo: "Novo",
  espontaneo: "Espontaneo",
};

function unavailableResult(): LoadRelatoriosResult {
  return {
    status: "unconfigured",
    clients: [],
    workedRows: [],
    convertedRows: [],
    followUpRows: [],
    pointRows: [],
    message:
      "Supabase ainda nao esta configurado. Os relatorios estao usando o fallback local/mock.",
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

function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
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

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberOrZero(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
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

function interactionAction(row: Row) {
  const status = contactStatus(row.work_status ?? row.status);
  const canal = channel(row.channel);

  if (!status) {
    return "Interacao registrada";
  }

  return `${statusActionLabels[status]} via ${channelLabels[canal]}`;
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

function normalizeClient(input: {
  item: Row;
  customer: Row;
  contacts: Row[];
  salesperson: Row | null;
  latestInteraction: Row | null;
}): CarteiraClient {
  const { item, customer, contacts, salesperson, latestInteraction } = input;
  const nomeFantasia = stringOrNull(customer.trade_name);
  const razaoSocial = stringOrNull(customer.legal_name);
  const vendedor =
    stringOrNull(salesperson?.name) ??
    stringOrNull(customer.last_order_salesperson_name) ??
    "Sem vendedor";
  const latestStatus = contactStatus(
    latestInteraction?.work_status ?? latestInteraction?.status,
  );
  const latestDate = dateOnly(
    latestInteraction?.interaction_at ?? latestInteraction?.created_at,
  );
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
    status: latestStatus ?? workStatus(item.work_status ?? customer.work_status),
    ultimaAcao: latestInteraction
      ? {
          tipo: interactionAction(latestInteraction),
          data: latestDate,
        }
      : {
          tipo:
            stringOrNull(customer.last_action_label) ?? "Sem acao registrada",
          data: dateOnly(customer.last_action_at),
        },
  };
}

function clientWithInteraction(client: CarteiraClient, interaction: Row) {
  const status = contactStatus(interaction.work_status ?? interaction.status);

  return {
    ...client,
    status: status ?? client.status,
    ultimaAcao: {
      tipo: interactionAction(interaction),
      data: dateOnly(interaction.interaction_at ?? interaction.created_at),
    },
  };
}

function isOverdue(date: string | null) {
  return Boolean(date && date < TODAY);
}

function followUpStatus(value: unknown): FollowUpRow["status"] {
  if (value === "concluido") {
    return "Concluido";
  }

  if (value === "vencido") {
    return "Em atraso";
  }

  return "Aberto";
}

function followUpReason(row: Row) {
  return (
    stringOrNull(row.notes) ??
    stringOrNull(row.reason) ??
    (row.source === "interacao" ? "Follow-up de interacao" : "Follow-up aberto")
  );
}

function sellerNameForRow(input: {
  row: Row;
  client: CarteiraClient | null;
  salespeopleById: Map<string, Row>;
}) {
  const salespersonId =
    stringOrNull(input.row.salesperson_id) ??
    stringOrNull(input.row.assigned_to) ??
    input.client?.vendedorId;
  const salesperson = salespersonId
    ? input.salespeopleById.get(salespersonId)
    : null;

  return stringOrNull(salesperson?.name) ?? input.client?.vendedor ?? "Sem vendedor";
}

function mapWorkedRows(
  interactions: Row[],
  clientsById: Map<string, CarteiraClient>,
) {
  return interactions.flatMap<WorkedRow>((interaction) => {
    const customerId = stringOrNull(interaction.customer_id);
    const client = customerId ? clientsById.get(customerId) : null;
    const dataInteracao = dateOnly(
      interaction.interaction_at ?? interaction.created_at,
    );

    if (!client || !dataInteracao) {
      return [];
    }

    return [
      {
        id: String(interaction.id),
        client: clientWithInteraction(client, interaction),
        canal: channelLabels[channel(interaction.channel)],
        dataInteracao,
      },
    ];
  });
}

function mapConvertedRows(
  interactions: Row[],
  clientsById: Map<string, CarteiraClient>,
) {
  return interactions.flatMap<ConvertedRow>((interaction) => {
    const status = contactStatus(interaction.work_status ?? interaction.status);
    const customerId = stringOrNull(interaction.customer_id);
    const client = customerId ? clientsById.get(customerId) : null;
    const dataConversao = dateOnly(
      interaction.interaction_at ?? interaction.created_at,
    );

    if (status !== "convertido" || !client || !dataConversao) {
      return [];
    }

    return [
      {
        id: String(interaction.id),
        client: clientWithInteraction(client, interaction),
        valorRecuperado: numberOrZero(interaction.recovered_value),
        dataConversao,
        origem:
          customerTypeLabels[String(interaction.customer_type)] ?? "Loja",
      },
    ];
  });
}

function mapFollowUpRows(
  followUps: Row[],
  clientsById: Map<string, CarteiraClient>,
) {
  return followUps.flatMap<FollowUpRow>((followUp) => {
    const customerId = stringOrNull(followUp.customer_id);
    const client = customerId ? clientsById.get(customerId) : null;
    const prazo = dateOnly(followUp.due_at);
    const storedStatus = followUpStatus(followUp.status);

    if (!client || !prazo) {
      return [];
    }

    return [
      {
        id: String(followUp.id),
        client,
        prazo,
        status: storedStatus,
        motivo: followUpReason(followUp),
        situacao:
          storedStatus === "Em atraso" || isOverdue(prazo)
            ? "Em atraso"
            : "No prazo",
      },
    ];
  });
}

function mapPointRows(input: {
  pointEvents: Row[];
  clientsById: Map<string, CarteiraClient>;
  salespeopleById: Map<string, Row>;
}) {
  return input.pointEvents.flatMap<PointRow>((event) => {
    const customerId = stringOrNull(event.customer_id);
    const client = customerId ? input.clientsById.get(customerId) ?? null : null;
    const data = dateOnly(event.occurred_at ?? event.created_at);

    if (!data) {
      return [];
    }

    return [
      {
        id: String(event.id),
        client,
        vendedor: sellerNameForRow({
          row: event,
          client,
          salespeopleById: input.salespeopleById,
        }),
        pontos: integerOrZero(event.points),
        acao: stringOrNull(event.action) ?? "pontuacao",
        descricao:
          stringOrNull(event.description) ?? "Pontuacao comercial registrada",
        origem: stringOrNull(event.origin) ?? "system",
        data,
      },
    ];
  });
}

async function latestPublishedImport(client: SupabaseServiceClient) {
  const imports = await expectNoError(
    client
      .from("portfolio_imports")
      .select("id,file_name,published_at,total_rows,created_at")
      .eq("status", "publicada")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1),
    "Nao foi possivel consultar a ultima importacao publicada",
  );

  return asRows(imports)[0] ?? null;
}

export async function loadRelatoriosFromSupabase(): Promise<LoadRelatoriosResult> {
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
        workedRows: [],
        convertedRows: [],
        followUpRows: [],
        pointRows: [],
        message:
          "Nenhuma importacao publicada foi encontrada no Supabase. Os relatorios estao usando o fallback local/mock.",
      };
    }

    const importId = String(importRow.id);
    const items = await queryAllRowsPaged(
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
      "Nao foi possivel consultar a carteira atual",
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
        workedRows: [],
        convertedRows: [],
        followUpRows: [],
        pointRows: [],
        message: "A ultima importacao publicada nao possui clientes atuais.",
      };
    }

    const [customers, contacts, interactions, followUps, pointEvents] =
      await Promise.all([
        queryRowsInChunks(
          customerIds,
          (ids) => client.from("customers").select("*").in("id", ids),
          "Nao foi possivel consultar clientes dos relatorios",
        ),
        queryRowsInChunks(
          customerIds,
          (ids) =>
            client
              .from("customer_contacts")
              .select("customer_id,kind,value,is_primary")
              .in("customer_id", ids)
              .order("is_primary", { ascending: false }),
          "Nao foi possivel consultar contatos dos relatorios",
        ),
        queryRowsInChunks(
          customerIds,
          (ids) =>
            client
              .from("customer_interactions")
              .select(
                "id,customer_id,portfolio_item_id,salesperson_id,status,work_status,customer_type,channel,note,notes,recovered_value,next_follow_up_at,interaction_at,created_at",
              )
              .in("customer_id", ids)
              .order("interaction_at", { ascending: false, nullsFirst: false })
              .order("created_at", { ascending: false })
              .limit(5000),
          "Nao foi possivel consultar interacoes dos relatorios",
        ),
        queryRowsInChunks(
          customerIds,
          (ids) =>
            client
              .from("follow_ups")
              .select(
                "id,customer_id,interaction_id,salesperson_id,assigned_to,due_at,status,reason,notes,source,completed_at,created_at",
              )
              .in("customer_id", ids)
              .order("due_at", { ascending: true })
              .limit(5000),
          "Nao foi possivel consultar follow-ups dos relatorios",
        ),
        queryRowsInChunks(
          customerIds,
          (ids) =>
            client
              .from("point_events")
              .select(
                "id,campaign_id,customer_id,interaction_id,follow_up_id,salesperson_id,action,points,description,origin,occurred_at,created_at",
              )
              .in("customer_id", ids)
              .order("occurred_at", { ascending: false })
              .limit(5000),
          "Nao foi possivel consultar pontos dos relatorios",
        ),
      ]);

    const interactionRows = asRows(interactions);
    const followUpRows = asRows(followUps);
    const pointRows = asRows(pointEvents);
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
    const salespeople = salespersonIds.length
      ? await expectNoError(
          client.from("salespeople").select("id,name").in("id", salespersonIds),
          "Nao foi possivel consultar vendedores dos relatorios",
        )
      : [];
    const customersById = firstByKey(asRows(customers), "id");
    const contactsByCustomer = groupByKey(asRows(contacts), "customer_id");
    const salespeopleById = firstByKey(asRows(salespeople), "id");
    const latestInteractionByCustomer = firstByKey(
      interactionRows,
      "customer_id",
    );
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
        }),
      ];
    });
    const clientsById = new Map(clients.map((reportClient) => [
      reportClient.id,
      reportClient,
    ]));

    return {
      status: "available",
      clients,
      workedRows: mapWorkedRows(interactionRows, clientsById),
      convertedRows: mapConvertedRows(interactionRows, clientsById),
      followUpRows: mapFollowUpRows(followUpRows, clientsById),
      pointRows: mapPointRows({
        pointEvents: pointRows,
        clientsById,
        salespeopleById,
      }),
    };
  } catch (error) {
    return {
      status: "error",
      clients: [],
      workedRows: [],
      convertedRows: [],
      followUpRows: [],
      pointRows: [],
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar relatorios no Supabase.",
    };
  }
}
