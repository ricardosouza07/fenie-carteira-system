import { useSyncExternalStore } from "react";

import {
  getPublishedImportClients,
  PUBLISHED_CLIENTS_CHANGED_EVENT,
  replacePublishedImportClients,
} from "@/features/importacoes/storage";

import { carteiraClients } from "./mock-clients";
import { normalizePortfolioStatus } from "./portfolio-status";
import type { CarteiraClient } from "./types";

const PUBLISHED_CLIENTS_STORAGE_KEY = "fenie.importacoes.clientesPublicados";
const SUPABASE_CARTEIRA_SNAPSHOT_KEY = "fenie.carteira.supabaseSnapshot";
const SUPABASE_CARTEIRA_CHANGED_EVENT =
  "fenie.carteira.supabaseSnapshot.changed";

let cachedPublishedClientsValue: string | null = null;
let cachedCarteiraClients: CarteiraClient[] = carteiraClients;
let cachedSupabaseSnapshotValue: string | null = null;
let cachedSupabaseSnapshotClients: CarteiraClient[] = [];

function normalizeClientForStore(client: CarteiraClient): CarteiraClient {
  return {
    ...client,
    situacaoCarteira: normalizePortfolioStatus(client.situacaoCarteira),
    observacaoCarteira: client.observacaoCarteira ?? null,
  };
}

function mergeImportedClients(importedClients: CarteiraClient[]) {
  if (importedClients.length === 0) {
    return carteiraClients;
  }

  return importedClients.map(normalizeClientForStore);
}

export function getCarteiraClientsWithPublishedImports() {
  if (typeof window === "undefined") {
    return carteiraClients;
  }

  const storageValue = window.localStorage.getItem(PUBLISHED_CLIENTS_STORAGE_KEY);

  if (storageValue === cachedPublishedClientsValue) {
    return cachedCarteiraClients;
  }

  cachedPublishedClientsValue = storageValue;
  cachedCarteiraClients = mergeImportedClients(getPublishedImportClients());

  return cachedCarteiraClients;
}

function readSupabaseSnapshotClients() {
  if (typeof window === "undefined") {
    return [];
  }

  const storageValue = window.localStorage.getItem(
    SUPABASE_CARTEIRA_SNAPSHOT_KEY,
  );

  if (storageValue === cachedSupabaseSnapshotValue) {
    return cachedSupabaseSnapshotClients;
  }

  cachedSupabaseSnapshotValue = storageValue;

  try {
    cachedSupabaseSnapshotClients = storageValue
      ? (JSON.parse(storageValue) as CarteiraClient[]).map(
          normalizeClientForStore,
        )
      : [];
  } catch {
    cachedSupabaseSnapshotClients = [];
  }

  return cachedSupabaseSnapshotClients;
}

export function saveSupabaseCarteiraSnapshot(clients: CarteiraClient[]) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedClients = clients.map(normalizeClientForStore);
  const serializedClients = JSON.stringify(normalizedClients);

  window.localStorage.setItem(SUPABASE_CARTEIRA_SNAPSHOT_KEY, serializedClients);
  cachedSupabaseSnapshotValue = serializedClients;
  cachedSupabaseSnapshotClients = normalizedClients;
  window.dispatchEvent(new Event(SUPABASE_CARTEIRA_CHANGED_EVENT));
}

export function getCarteiraClientsForDetail() {
  const snapshotClients = readSupabaseSnapshotClients();

  return snapshotClients.length > 0
    ? snapshotClients
    : getCarteiraClientsWithPublishedImports();
}

export function getCarteiraClientById(clientId: string) {
  return getCarteiraClientsForDetail().find(
    (client) => client.id === clientId,
  );
}

export function persistImportedClientUpdate(updatedClient: CarteiraClient) {
  const importedClients = getPublishedImportClients();
  const hasImportedClient = importedClients.some(
    (client) => client.id === updatedClient.id,
  );
  const snapshotClients = readSupabaseSnapshotClients();
  const hasSnapshotClient = snapshotClients.some(
    (client) => client.id === updatedClient.id,
  );

  if (!hasImportedClient && !hasSnapshotClient) {
    return;
  }

  if (hasImportedClient) {
    replacePublishedImportClients(
      importedClients.map((client) =>
        client.id === updatedClient.id ? updatedClient : client,
      ),
    );
  }

  if (hasSnapshotClient) {
    saveSupabaseCarteiraSnapshot(
      snapshotClients.map((client) =>
        client.id === updatedClient.id ? updatedClient : client,
      ),
    );
  }
}

function subscribeToPublishedClients(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === PUBLISHED_CLIENTS_STORAGE_KEY ||
      event.key === null
    ) {
      callback();
    }
  };

  window.addEventListener(PUBLISHED_CLIENTS_CHANGED_EVENT, callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(PUBLISHED_CLIENTS_CHANGED_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useCarteiraClientsSource() {
  return useSyncExternalStore(
    subscribeToPublishedClients,
    getCarteiraClientsWithPublishedImports,
    () => carteiraClients,
  );
}

function subscribeToSupabaseSnapshot(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === SUPABASE_CARTEIRA_SNAPSHOT_KEY ||
      event.key === null
    ) {
      callback();
    }
  };

  window.addEventListener(SUPABASE_CARTEIRA_CHANGED_EVENT, callback);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(SUPABASE_CARTEIRA_CHANGED_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useCarteiraDetailClientsSource() {
  return useSyncExternalStore(
    subscribeToSupabaseSnapshot,
    getCarteiraClientsForDetail,
    () => carteiraClients,
  );
}
