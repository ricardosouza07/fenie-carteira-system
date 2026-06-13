import type { PointEvent } from "@/features/gamification/types";

import type { CarteiraClient, CarteiraInteraction } from "./types";

export type CarteiraSupabaseStatus =
  | "available"
  | "unconfigured"
  | "empty"
  | "error";

export type CarteiraSupabaseImportInfo = {
  id: string;
  arquivo: string;
  publicadoEm: string | null;
  totalClientes: number;
};

export type LoadCarteiraSupabaseResult = {
  status: CarteiraSupabaseStatus;
  clients: CarteiraClient[];
  importacao: CarteiraSupabaseImportInfo | null;
  message?: string;
};

export type SaveInteractionSupabaseStatus =
  | "saved"
  | "local_fallback"
  | "error";

export type SaveInteractionSupabaseInput = {
  client: CarteiraClient;
  interaction: CarteiraInteraction;
  pointEvents: PointEvent[];
  lastActionLabel: string;
};

export type SaveInteractionSupabaseResult = {
  status: SaveInteractionSupabaseStatus;
  message: string;
  interactionId?: string;
  followUpId?: string | null;
  pointEventIds?: string[];
};
