import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthenticatedSupabaseClient } from "@/features/auth/access";
import type {
  CarteiraClient,
  CarteiraInteraction,
  ClientLevel,
  ContactChannel,
  ContactStatus,
  WorkStatus,
} from "@/features/carteira/types";
import { getCurrentPeriod } from "@/lib/current-period";
import { fetchByIdBatches } from "@/lib/supabase/query-helpers";

import type { CalendarEvent, CalendarEventType, LoadCalendarioResult } from "./types";

type SupabaseServiceClient = SupabaseClient;
type Row = Record<string, unknown>;

const TODAY = getCurrentPeriod().date;

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

function unavailableResult(): LoadCalendarioResult {
  return {
    status: "unconfigured",
    clients: [],
    events: [],
    message:
      "Supabase ainda nao esta configurado. O calendario esta usando o fallback local/mock.",
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

function healthStatus(value: unknown): ClientLevel {
  return value === "saudavel" ||
    value === "atencao" ||
    value === "risco" ||
    value === "inativo"
    ? value
    : "saudavel";
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
  const interaction = latestInteraction ? mapInteraction(latestInteraction) : null;

  return {
    id: String(customer.id),
    portfolioItemId: stringOrNull(item.id) ?? undefined,
    vendedorId: stringOrNull(item.salesperson_id) ?? undefined,
    nivel: healthStatus(item.health_status ?? customer.health_status),
    cliente: nomeFantasia ?? razaoSocial ?? "Cliente sem nome",
    razaoSocial: razaoSocial ?? undefined,
    nomeFantasia: nomeFantasia ?? undefined,
    email: pickEmail(customer, contacts),
    telefone: pickPhone(customer, contacts),
    cidade: stringOrNull(customer.city) ?? "-",
    bairro: stringOrNull(customer.district) ?? "-",
    endereco: stringOrNull(customer.address) ?? undefined,
    diasSemComprar: integerOrZero(
      item.days_without_buying ?? customer.days_without_buying,
    ),
    cicloMedioCompraDias:
      typeof customer.average_purchase_cycle_days === "number"
        ? customer.average_purchase_cycle_days
        : undefined,
    proximaCompra: dateOnly(item.next_purchase_date ?? customer.next_purchase_date),
    ultimoPedido: dateOnly(item.last_order_date ?? customer.last_order_date),
    valorUltimoPedido: numberOrZero(customer.last_order_value),
    vendedor,
    vendedorUltimoPedido:
      stringOrNull(customer.last_order_salesperson_name) ?? vendedor,
    situacaoOriginal: stringOrNull(customer.original_situation) ?? undefined,
    status: latestStatus ?? workStatus(item.work_status ?? customer.work_status),
    ultimaAcao: latestInteraction
      ? {
          tipo: interactionAction(latestInteraction),
          data: latestDate,
        }
      : nextFollowUp
        ? {
            tipo: "Follow-up aberto",
            data: dateOnly(nextFollowUp.due_at),
          }
        : {
            tipo:
              stringOrNull(customer.last_action_label) ?? "Sem acao registrada",
            data: dateOnly(customer.last_action_at),
          },
    interacoes: interaction ? [interaction] : undefined,
  };
}

function eventTitle(type: CalendarEventType) {
  const labels: Record<CalendarEventType, string> = {
    proxima_compra: "Proxima compra",
    follow_up: "Follow-up",
    visita: "Visita",
    vencido: "Vencido",
    convertido: "Convertido",
  };

  return labels[type];
}

function customerHref(client: CarteiraClient) {
  return `/clientes/${client.id}`;
}

function followUpStatusLabel(value: unknown) {
  if (value === "concluido") {
    return "Concluido";
  }

  if (value === "vencido") {
    return "Vencido";
  }

  return "Aberto";
}

function followUpType(row: Row, dueDate: string): CalendarEventType {
  if (row.status === "vencido" || dueDate < TODAY) {
    return "vencido";
  }

  return "follow_up";
}

function followUpReason(row: Row) {
  return (
    stringOrNull(row.notes) ??
    stringOrNull(row.reason) ??
    (row.source === "interacao" ? "Follow-up de interacao" : "Follow-up aberto")
  );
}

function interactionStatus(row: Row) {
  return contactStatus(row.work_status ?? row.status);
}

function buildFollowUpEvents(
  followUps: Row[],
  clientsById: Map<string, CarteiraClient>,
) {
  return followUps.flatMap<CalendarEvent>((row) => {
    const customerId = stringOrNull(row.customer_id);
    const client = customerId ? clientsById.get(customerId) : null;
    const date = dateOnly(row.due_at);

    if (!client || !date) {
      return [];
    }

    const completed = row.status === "concluido";
    const type = completed ? "follow_up" : followUpType(row, date);

    return [
      {
        id: `follow-up-${row.id}`,
        type,
        source: "follow_up",
        date,
        client,
        customerHref: customerHref(client),
        title: eventTitle(type),
        description: followUpReason(row),
        statusLabel: followUpStatusLabel(row.status),
        followUpId: String(row.id),
        canReschedule: !completed,
        canComplete: !completed,
      },
    ];
  });
}

function buildNextPurchaseEvents(clients: CarteiraClient[]) {
  return clients.flatMap<CalendarEvent>((client) => {
    if (!client.proximaCompra) {
      return [];
    }

    const type = client.proximaCompra < TODAY ? "vencido" : "proxima_compra";

    return [
      {
        id: `next-purchase-${client.id}`,
        type,
        source: "proxima_compra",
        date: client.proximaCompra,
        client,
        customerHref: customerHref(client),
        title: eventTitle(type),
        description: "Proxima compra prevista na carteira atual",
        statusLabel: type === "vencido" ? "Vencida" : "Prevista",
        canReschedule: false,
        canComplete: false,
      },
    ];
  });
}

function buildInteractionEvents(
  interactions: Row[],
  clientsById: Map<string, CarteiraClient>,
) {
  return interactions.flatMap<CalendarEvent>((row) => {
    const status = interactionStatus(row);

    if (status !== "visita" && status !== "convertido") {
      return [];
    }

    const customerId = stringOrNull(row.customer_id);
    const client = customerId ? clientsById.get(customerId) : null;
    const date = dateOnly(row.interaction_at ?? row.created_at);

    if (!client || !date) {
      return [];
    }

    const type = status === "visita" ? "visita" : "convertido";

    return [
      {
        id: `interaction-${row.id}`,
        type,
        source: "interaction",
        date,
        client: {
          ...client,
          status,
          ultimaAcao: {
            tipo: interactionAction(row),
            data: date,
          },
        },
        customerHref: customerHref(client),
        title: eventTitle(type),
        description:
          stringOrNull(row.notes) ??
          stringOrNull(row.note) ??
          (status === "visita"
            ? "Visita encaminhada"
            : "Cliente convertido"),
        statusLabel: status === "visita" ? "Visita encaminhada" : "Convertido",
        canReschedule: false,
        canComplete: false,
      },
    ];
  });
}

function buildWaitingReturnEvents(input: {
  clients: CarteiraClient[];
  followUpsByCustomer: Map<string, Row[]>;
}) {
  return input.clients.flatMap<CalendarEvent>((client) => {
    if (client.status !== "aguardando") {
      return [];
    }

    const hasOpenFollowUp = (input.followUpsByCustomer.get(client.id) ?? []).some(
      (followUp) => followUp.status === "aberto" || followUp.status === "vencido",
    );

    if (hasOpenFollowUp) {
      return [];
    }

    const date = client.proximaCompra ?? client.ultimaAcao.data ?? TODAY;
    const type = date < TODAY ? "vencido" : "follow_up";

    return [
      {
        id: `waiting-return-${client.id}`,
        type,
        source: "status",
        date,
        client,
        customerHref: customerHref(client),
        title: eventTitle(type),
        description: "Cliente aguardando retorno sem follow-up aberto vinculado",
        statusLabel: "Aguardando retorno",
        canReschedule: false,
        canComplete: false,
      },
    ];
  });
}

function sortEvents(events: CalendarEvent[]) {
  return [...events].sort((first, second) => {
    if (first.date === second.date) {
      return first.client.cliente.localeCompare(second.client.cliente, "pt-BR");
    }

    return first.date.localeCompare(second.date);
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

export async function loadCalendarioFromSupabase(): Promise<LoadCalendarioResult> {
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
        events: [],
        message:
          "Nenhuma importacao publicada foi encontrada no Supabase. O calendario esta usando o fallback local/mock.",
      };
    }

    const importId = String(importRow.id);
    const items = asRows(
      await expectNoError(
        client
          .from("portfolio_items")
          .select(
            "id,customer_id,salesperson_id,health_status,work_status,days_without_buying,next_purchase_date,last_order_date,is_current,imported_at",
          )
          .eq("import_id", importId)
          .eq("is_current", true)
          .order("next_purchase_date", { ascending: true, nullsFirst: false }),
        "Nao foi possivel consultar os itens da carteira atual",
      ),
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
        events: [],
        message: "A ultima importacao publicada nao possui clientes atuais.",
      };
    }

    const [customers, contacts, interactionRows, followUpRows] =
      await Promise.all([
        fetchByIdBatches<Row>(
          customerIds,
          (batch, from, to) =>
            client
              .from("customers")
              .select("*")
              .in("id", batch)
              .order("id", { ascending: true })
              .range(from, to),
          "Nao foi possivel consultar clientes do calendario",
        ),
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
          "Nao foi possivel consultar contatos do calendario",
        ),
        fetchByIdBatches<Row>(
          customerIds,
          (batch, from, to) =>
            client
              .from("customer_interactions")
              .select(
                "id,customer_id,portfolio_item_id,salesperson_id,status,work_status,customer_type,channel,note,notes,recovered_value,next_follow_up_at,interaction_at,created_at",
              )
              .in("customer_id", batch)
              .order("interaction_at", {
                ascending: false,
                nullsFirst: false,
              })
              .order("created_at", { ascending: false })
              .range(from, to),
          "Nao foi possivel consultar interacoes do calendario",
        ),
        fetchByIdBatches<Row>(
          customerIds,
          (batch, from, to) =>
            client
              .from("follow_ups")
              .select(
                "id,customer_id,interaction_id,salesperson_id,assigned_to,due_at,status,reason,notes,source,completed_at,created_at",
              )
              .in("customer_id", batch)
              .in("status", ["aberto", "vencido", "concluido"])
              .order("due_at", { ascending: true })
              .range(from, to),
          "Nao foi possivel consultar follow-ups do calendario",
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
        ].filter(Boolean),
      ),
    ) as string[];
    const salespeople = salespersonIds.length
      ? await fetchByIdBatches<Row>(
          salespersonIds,
          (batch, from, to) =>
            client
              .from("salespeople")
              .select("id,name")
              .in("id", batch)
              .order("id", { ascending: true })
              .range(from, to),
          "Nao foi possivel consultar vendedores do calendario",
        )
      : [];
    const customersById = firstByKey(customers, "id");
    const contactsByCustomer = groupByKey(contacts, "customer_id");
    const salespeopleById = firstByKey(salespeople, "id");
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
    const clientsById = new Map(clients.map((calendarClient) => [
      calendarClient.id,
      calendarClient,
    ]));

    return {
      status: "available",
      clients,
      events: sortEvents([
        ...buildFollowUpEvents(followUpRows, clientsById),
        ...buildNextPurchaseEvents(clients),
        ...buildInteractionEvents(interactionRows, clientsById),
        ...buildWaitingReturnEvents({ clients, followUpsByCustomer }),
      ]),
    };
  } catch (error) {
    return {
      status: "error",
      clients: [],
      events: [],
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel carregar o calendario no Supabase.",
    };
  }
}
