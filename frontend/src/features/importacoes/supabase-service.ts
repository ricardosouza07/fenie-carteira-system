import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthenticatedSupabaseClient } from "@/features/auth/access";
import { createOptionalSupabaseServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

import type {
  ListSupabaseImportsResult,
  PublishSupabaseImportInput,
  PublishSupabaseImportResult,
} from "./server-types";
import type { ImportPreviewRow, ImportRecord } from "./types";

type SupabaseServiceClient = SupabaseClient;
type SupabaseAuthenticatedClient = SupabaseClient;

type SalespersonEntry = {
  id: string;
  name: string;
};

type PublishStats = {
  createdCustomers: number;
  updatedCustomers: number;
  createdSalespeople: number;
  portfolioItems: number;
};

const IMPORT_BATCH_SIZE = 500;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function nonEmpty(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

function mapImportRecord(row: Record<string, Json>): ImportRecord {
  return {
    id: String(row.id),
    arquivo: String(row.file_name ?? "importacao.xlsx"),
    criadoEm: String(row.created_at),
    publicadoEm: row.published_at ? String(row.published_at) : undefined,
    status: String(row.status ?? "rascunho") as ImportRecord["status"],
    totalLinhas: Number(row.total_rows ?? 0),
    linhasValidas: Number(row.valid_rows ?? 0),
    linhasInvalidas: Number(row.invalid_rows ?? 0),
    duplicados: Number(row.possible_duplicates ?? 0),
    colunasReconhecidas: Number(row.recognized_columns ?? 0),
    colunasNaoReconhecidas: Number(row.unrecognized_columns ?? 0),
    mensagem: row.error_message ? String(row.error_message) : undefined,
    usuario: "Servico Supabase",
    origem: "supabase",
  };
}

function buildUnavailableResult(): ListSupabaseImportsResult {
  return {
    status: "unconfigured",
    records: [],
    message:
      "Supabase ainda nao esta configurado. Configure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY para gravar importacoes no banco.",
  };
}

function isImportManager(role: string | undefined) {
  return role === "admin" || role === "supervisor";
}

function unavailableImportMessage(message?: string | null) {
  return (
    message ??
    "Supabase ainda nao esta configurado. O fluxo de importacao segue em modo local/mock."
  );
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

async function loadSalespeople(client: SupabaseServiceClient) {
  const salespeople = await expectNoError(
    client.from("salespeople").select("id,name").eq("active", true),
    "Nao foi possivel carregar vendedores",
  );
  const aliases = await expectNoError(
    client.from("salesperson_aliases").select("salesperson_id,alias"),
    "Nao foi possivel carregar aliases de vendedores",
  );
  const byName = new Map<string, SalespersonEntry>();

  for (const salesperson of salespeople) {
    const id = String(salesperson.id);
    const name = String(salesperson.name);

    byName.set(normalizeText(name), { id, name });
  }

  for (const alias of aliases) {
    const key = normalizeText(String(alias.alias));
    const salesperson = salespeople.find(
      (item) => String(item.id) === String(alias.salesperson_id),
    );

    if (salesperson) {
      byName.set(key, {
        id: String(salesperson.id),
        name: String(salesperson.name),
      });
    }
  }

  return byName;
}

async function resolveSalesperson(
  client: SupabaseServiceClient,
  byName: Map<string, SalespersonEntry>,
  rawName: string,
) {
  const name = nonEmpty(rawName);

  if (!name) {
    return { salesperson: null, created: false };
  }

  const key = normalizeText(name);
  const existing = byName.get(key);

  if (existing) {
    return { salesperson: existing, created: false };
  }

  const created = await expectNoError(
    client
      .from("salespeople")
      .insert({
        name,
        role: "vendedor_interno",
        active: true,
      })
      .select("id,name")
      .single(),
    `Nao foi possivel criar vendedor ${name}`,
  );
  const salesperson = {
    id: String(created.id),
    name: String(created.name),
  };

  byName.set(key, salesperson);

  await expectNoError(
    client.from("salesperson_aliases").insert({
      salesperson_id: salesperson.id,
      alias: name,
    }),
    `Nao foi possivel criar alias do vendedor ${name}`,
  );

  return { salesperson, created: true };
}

async function findCustomerId(
  client: SupabaseServiceClient,
  row: ImportPreviewRow,
) {
  const phone = normalizePhone(row.telefone);

  if (phone.length >= 8) {
    const data = await expectNoError(
      client
        .from("customers")
        .select("id")
        .eq("phone_normalized", phone)
        .limit(1),
      `Nao foi possivel consultar cliente pelo telefone da linha ${row.rowNumber}`,
    );

    const first = data[0];

    if (first?.id) {
      return String(first.id);
    }
  }

  const tradeName = nonEmpty(row.nomeFantasia || row.razaoSocial);

  if (!tradeName) {
    return null;
  }

  let query = client
    .from("customers")
    .select("id")
    .or(`trade_name.eq.${tradeName},legal_name.eq.${tradeName}`)
    .limit(1);

  const city = nonEmpty(row.cidade);

  if (city) {
    query = query.eq("city", city);
  }

  const data = await expectNoError(
    query,
    `Nao foi possivel consultar cliente pelo nome da linha ${row.rowNumber}`,
  );

  return data[0]?.id ? String(data[0].id) : null;
}

async function upsertCustomer(
  client: SupabaseServiceClient,
  importId: string,
  row: ImportPreviewRow,
  salesperson: SalespersonEntry | null,
) {
  const existingId = await findCustomerId(client, row);
  const customerPayload = {
    legal_name: nonEmpty(row.razaoSocial),
    trade_name: nonEmpty(row.nomeFantasia || row.cliente),
    email: nonEmpty(row.email),
    phone_primary: nonEmpty(row.telefone),
    city: nonEmpty(row.cidade),
    state: nonEmpty(row.estado),
    district: nonEmpty(row.bairro),
    zip_code: nonEmpty(row.cep),
    address: nonEmpty(row.endereco),
    assigned_salesperson_id: salesperson?.id ?? null,
    last_order_salesperson_name: salesperson?.name ?? nonEmpty(row.vendedor),
    last_order_date: row.ultimoPedido,
    last_order_value: row.valorUltimoPedido,
    days_without_buying: row.diasSemComprar,
    average_purchase_cycle_days: row.cicloMedioCompraDias,
    next_purchase_date: row.proximaCompra,
    original_situation: nonEmpty(row.situacao),
    health_status: row.nivel,
    work_status: "nao_trabalhado",
    last_action_label: "Importado da planilha",
    source_import_id: importId,
    external_key: row.duplicateKey ?? `import:${importId}:row:${row.rowNumber}`,
    active: true,
  };

  if (existingId) {
    await expectNoError(
      client.from("customers").update(customerPayload).eq("id", existingId),
      `Nao foi possivel atualizar cliente da linha ${row.rowNumber}`,
    );

    return { customerId: existingId, created: false };
  }

  const created = await expectNoError(
    client
      .from("customers")
      .insert(customerPayload)
      .select("id")
      .single(),
    `Nao foi possivel criar cliente da linha ${row.rowNumber}`,
  );

  return { customerId: String(created.id), created: true };
}

async function ensureCustomerContacts(
  client: SupabaseServiceClient,
  customerId: string,
  row: ImportPreviewRow,
) {
  const contacts = [
    {
      kind: "telefone",
      value: nonEmpty(row.telefone),
      value_normalized: normalizePhone(row.telefone),
      is_primary: true,
    },
    {
      kind: "email",
      value: nonEmpty(row.email),
      value_normalized: nonEmpty(row.email.toLowerCase()),
      is_primary: false,
    },
  ].filter((contact) => contact.value);

  for (const contact of contacts) {
    const existing = await expectNoError(
      client
        .from("customer_contacts")
        .select("id")
        .eq("customer_id", customerId)
        .eq("kind", contact.kind)
        .eq("value", contact.value)
        .limit(1),
      "Nao foi possivel consultar contatos do cliente",
    );

    if (existing.length > 0) {
      continue;
    }

    await expectNoError(
      client.from("customer_contacts").insert({
        customer_id: customerId,
        ...contact,
      }),
      "Nao foi possivel criar contato do cliente",
    );
  }
}

async function saveImportRows(
  client: SupabaseServiceClient,
  importId: string,
  rows: ImportPreviewRow[],
) {
  const payload = rows.map((row) => ({
    import_id: importId,
    row_number: row.rowNumber,
    raw_data: toJson({}),
    normalized_data: toJson(row),
    is_valid: row.isValid,
    invalid_reasons: row.invalidReasons,
    duplicate_key: row.duplicateKey,
  }));

  for (const batch of chunkRows(payload, IMPORT_BATCH_SIZE)) {
    await expectNoError(
      client.from("portfolio_import_rows").insert(batch),
      "Nao foi possivel salvar linhas normalizadas da importacao",
    );
  }
}

async function savePortfolioItems(
  client: SupabaseServiceClient,
  importId: string,
  items: Array<{
    customerId: string;
    salespersonId: string | null;
    row: ImportPreviewRow;
  }>,
) {
  const uniqueItems = Array.from(
    new Map(items.map((item) => [item.customerId, item])).values(),
  );

  if (uniqueItems.length === 0) {
    return 0;
  }

  await expectNoError(
    client.from("portfolio_items").update({ is_current: false }).eq("is_current", true),
    "Nao foi possivel encerrar carteira atual",
  );

  const payload = uniqueItems.map((item) => ({
    import_id: importId,
    customer_id: item.customerId,
    salesperson_id: item.salespersonId,
    health_status: item.row.nivel,
    work_status: "nao_trabalhado",
    days_without_buying: item.row.diasSemComprar,
    next_purchase_date: item.row.proximaCompra,
    last_order_date: item.row.ultimoPedido,
    is_current: true,
  }));

  for (const batch of chunkRows(payload, IMPORT_BATCH_SIZE)) {
    await expectNoError(
      client.from("portfolio_items").insert(batch),
      "Nao foi possivel criar itens da carteira",
    );
  }

  return uniqueItems.length;
}

export async function listSupabaseImportRecords(): Promise<ListSupabaseImportsResult> {
  const access = await getAuthenticatedSupabaseClient();
  const client = access.client as SupabaseAuthenticatedClient | null;

  if (!client) {
    return {
      ...buildUnavailableResult(),
      message: unavailableImportMessage(access.message),
    };
  }

  if (!isImportManager(access.profile?.role)) {
    return {
      status: "error",
      records: [],
      message: "Seu perfil nao tem permissao para consultar importacoes.",
    };
  }

  try {
    const data = await expectNoError(
      client
        .from("portfolio_imports")
        .select(
          "id,file_name,status,total_rows,valid_rows,invalid_rows,possible_duplicates,recognized_columns,unrecognized_columns,published_at,created_at,error_message",
        )
        .order("created_at", { ascending: false })
        .limit(50),
      "Nao foi possivel listar importacoes no Supabase",
    );

    return {
      status: "available",
      records: data.map((row) => mapImportRecord(row)),
    };
  } catch (error) {
    return {
      status: "error",
      records: [],
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel consultar as importacoes reais.",
    };
  }
}

export async function publishSupabaseImport(
  input: PublishSupabaseImportInput,
): Promise<PublishSupabaseImportResult> {
  const access = await getAuthenticatedSupabaseClient();

  if (!access.client) {
    return {
      status: "unconfigured",
      message: unavailableImportMessage(access.message),
    };
  }

  if (!isImportManager(access.profile?.role)) {
    return {
      status: "error",
      message: "Seu perfil nao tem permissao para publicar importacoes.",
    };
  }

  const client =
    createOptionalSupabaseServiceClient() as SupabaseServiceClient | null;

  if (!client) {
    return {
      status: "unconfigured",
      message: buildUnavailableResult().message ?? "Supabase nao configurado.",
    };
  }

  const now = new Date().toISOString();
  let importId: string | null = null;
  const stats: PublishStats = {
    createdCustomers: 0,
    updatedCustomers: 0,
    createdSalespeople: 0,
    portfolioItems: 0,
  };

  try {
    const createdImport = await expectNoError(
      client
        .from("portfolio_imports")
        .insert({
          file_name: input.result.fileName || input.record.arquivo,
          sheet_name: input.result.sheetName,
          status: "validada",
          header_row_index: input.result.headerRowIndex,
          total_rows: input.result.totalRows,
          valid_rows: input.result.validRows,
          invalid_rows: input.result.invalidRows,
          possible_duplicates: input.result.possibleDuplicates,
          recognized_columns: input.result.recognizedColumns.length,
          unrecognized_columns: input.result.unrecognizedColumns.length,
          created_by: access.profile?.id ?? null,
          summary: toJson({
            requestedImportId: input.requestedImportId,
            recognizedColumns: input.result.recognizedColumns,
            unrecognizedColumns: input.result.unrecognizedColumns,
          }),
          validated_at: now,
        })
        .select("id,created_at")
        .single(),
      "Nao foi possivel criar registro da importacao",
    );

    importId = String(createdImport.id);

    await saveImportRows(client, importId, input.result.rows);

    const validRows = input.result.rows.filter((row) => row.isValid);
    const salespeopleByName = await loadSalespeople(client);
    const portfolioItems: Array<{
      customerId: string;
      salespersonId: string | null;
      row: ImportPreviewRow;
    }> = [];

    for (const row of validRows) {
      const { salesperson, created } = await resolveSalesperson(
        client,
        salespeopleByName,
        row.vendedor,
      );

      if (created) {
        stats.createdSalespeople += 1;
      }

      const customer = await upsertCustomer(client, importId, row, salesperson);

      if (customer.created) {
        stats.createdCustomers += 1;
      } else {
        stats.updatedCustomers += 1;
      }

      await ensureCustomerContacts(client, customer.customerId, row);

      portfolioItems.push({
        customerId: customer.customerId,
        salespersonId: salesperson?.id ?? null,
        row,
      });
    }

    stats.portfolioItems = await savePortfolioItems(
      client,
      importId,
      portfolioItems,
    );

    const published = await expectNoError(
      client
        .from("portfolio_imports")
        .update({
          status: "publicada",
          published_at: new Date().toISOString(),
          summary: toJson({
            requestedImportId: input.requestedImportId,
            recognizedColumns: input.result.recognizedColumns,
            unrecognizedColumns: input.result.unrecognizedColumns,
            stats,
          }),
        })
        .eq("id", importId)
        .select(
          "id,file_name,status,total_rows,valid_rows,invalid_rows,possible_duplicates,recognized_columns,unrecognized_columns,published_at,created_at,error_message",
        )
        .single(),
      "Nao foi possivel marcar importacao como publicada",
    );

    return {
      status: "published",
      record: mapImportRecord(published),
      publishedClients: validRows.length,
      ...stats,
      message: "Importacao publicada no Supabase com sucesso.",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel publicar a importacao no Supabase.";

    if (importId) {
      await client
        .from("portfolio_imports")
        .update({
          status: "erro",
          error_message: message,
        })
        .eq("id", importId);
    }

    return {
      status: "error",
      message,
    };
  }
}
