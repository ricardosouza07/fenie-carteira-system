import type { CarteiraClient } from "@/features/carteira/types";
import { normalizeFinancialStatus } from "@/features/carteira/financial-status";

import type { ImportRecord } from "./types";

const IMPORT_RECORDS_STORAGE_KEY = "fenie.importacoes";
const PUBLISHED_CLIENTS_STORAGE_KEY = "fenie.importacoes.clientesPublicados";
export const PUBLISHED_CLIENTS_CHANGED_EVENT =
  "fenie.importacoes.clientesPublicados.changed";

export const mockImportRecords: ImportRecord[] = [
  {
    id: "mock-imp-001",
    arquivo: "carteira-maio-2026.xlsx",
    criadoEm: "2026-05-22T09:20:00.000Z",
    publicadoEm: "2026-05-22T09:34:00.000Z",
    status: "publicada",
    totalLinhas: 418,
    linhasValidas: 402,
    linhasInvalidas: 16,
    duplicados: 9,
    colunasReconhecidas: 14,
    colunasNaoReconhecidas: 3,
  },
  {
    id: "mock-imp-002",
    arquivo: "base-vendedores-abril.xlsx",
    criadoEm: "2026-05-18T14:10:00.000Z",
    status: "validada",
    totalLinhas: 389,
    linhasValidas: 377,
    linhasInvalidas: 12,
    duplicados: 6,
    colunasReconhecidas: 13,
    colunasNaoReconhecidas: 4,
  },
  {
    id: "mock-imp-003",
    arquivo: "clientes-antigos.xlsx",
    criadoEm: "2026-05-12T11:45:00.000Z",
    status: "erro",
    totalLinhas: 0,
    linhasValidas: 0,
    linhasInvalidas: 0,
    duplicados: 0,
    colunasReconhecidas: 0,
    colunasNaoReconhecidas: 0,
    mensagem: "Cabeçalho não identificado na primeira aba.",
  },
  {
    id: "mock-imp-004",
    arquivo: "rascunho-carteira-semana.xlsx",
    criadoEm: "2026-05-25T16:05:00.000Z",
    status: "rascunho",
    totalLinhas: 0,
    linhasValidas: 0,
    linhasInvalidas: 0,
    duplicados: 0,
    colunasReconhecidas: 0,
    colunasNaoReconhecidas: 0,
  },
];

function readJsonFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const storedValue = window.localStorage.getItem(key);

    return storedValue ? (JSON.parse(storedValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function notifyPublishedClientsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(PUBLISHED_CLIENTS_CHANGED_EVENT));
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }

  return digits;
}

function normalizeDocument(value: string | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

function identityKeys(client: CarteiraClient) {
  const phone = normalizePhone(client.telefone);
  const document = normalizeDocument(client.documento);
  const legalName = normalizeText(client.razaoSocial ?? "");
  const nameCity = normalizeText(`${client.cliente} ${client.cidade}`);
  const tradeCity = normalizeText(
    `${client.nomeFantasia ?? client.razaoSocial ?? ""} ${client.cidade}`,
  );

  return [
    phone ? `phone:${phone}` : null,
    document.length >= 11 ? `document:${document}` : null,
    legalName.length >= 3 ? `legal:${legalName}` : null,
    nameCity.length >= 6 ? `name:${nameCity}` : null,
    tradeCity.length >= 6 ? `trade:${tradeCity}` : null,
  ].filter((key): key is string => Boolean(key));
}

function buildOperationalSnapshot(clients: CarteiraClient[]) {
  const snapshot = new Map<
    string,
    Pick<
      CarteiraClient,
      | "situacaoFinanceira"
      | "observacaoFinanceira"
      | "status"
      | "ultimaAcao"
      | "interacoes"
    >
  >();

  for (const client of clients) {
    const operationalData = {
      situacaoFinanceira: normalizeFinancialStatus(client.situacaoFinanceira),
      observacaoFinanceira: client.observacaoFinanceira ?? null,
      status: client.status,
      ultimaAcao: client.ultimaAcao,
      interacoes: client.interacoes,
    };

    identityKeys(client).forEach((key) => {
      if (!snapshot.has(key)) {
        snapshot.set(key, operationalData);
      }
    });
  }

  return snapshot;
}

function preserveOperationalData(
  client: CarteiraClient,
  snapshot: Map<
    string,
    Pick<
      CarteiraClient,
      | "situacaoFinanceira"
      | "observacaoFinanceira"
      | "status"
      | "ultimaAcao"
      | "interacoes"
    >
  >,
) {
  const previous = identityKeys(client)
    .map((key) => snapshot.get(key))
    .find(Boolean);

  return previous
    ? {
        ...client,
        situacaoFinanceira: previous.situacaoFinanceira,
        observacaoFinanceira: previous.observacaoFinanceira ?? null,
        status: previous.status,
        ultimaAcao: previous.ultimaAcao,
        interacoes: previous.interacoes,
      }
    : client;
}

export function getLocalImportRecords() {
  return readJsonFromStorage<ImportRecord[]>(IMPORT_RECORDS_STORAGE_KEY, []);
}

export function saveLocalImportRecords(records: ImportRecord[]) {
  writeJsonToStorage(IMPORT_RECORDS_STORAGE_KEY, records);
}

export function getPublishedImportClients() {
  return readJsonFromStorage<CarteiraClient[]>(PUBLISHED_CLIENTS_STORAGE_KEY, []);
}

export function savePublishedImportClients(
  importId: string,
  clients: CarteiraClient[],
) {
  const previousOperationalData = buildOperationalSnapshot(
    getPublishedImportClients(),
  );
  const nextClients = clients.map((client) => ({
    ...preserveOperationalData(client, previousOperationalData),
    id: client.id.startsWith(`${importId}-`)
      ? client.id
      : `${importId}-${client.id}`,
  }));

  writeJsonToStorage(PUBLISHED_CLIENTS_STORAGE_KEY, nextClients);
  notifyPublishedClientsChanged();

  return nextClients;
}

export function replacePublishedImportClients(clients: CarteiraClient[]) {
  writeJsonToStorage(PUBLISHED_CLIENTS_STORAGE_KEY, clients);
  notifyPublishedClientsChanged();
}
