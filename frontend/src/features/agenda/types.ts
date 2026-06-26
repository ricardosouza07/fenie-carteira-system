import type { CarteiraClient } from "@/features/carteira/types";

export type AgendaFilter = "hoje" | "recompra" | "semana" | "todos";

export type AgendaGroupKey =
  | "recompra"
  | "hoje"
  | "proximos_7"
  | "aguardando"
  | "visitas";

export type AgendaSource =
  | "follow_up"
  | "proxima_compra"
  | "status"
  | "interaction";

export type AgendaItem = {
  id: string;
  clienteId: string;
  followUpId?: string;
  source: AgendaSource;
  group: AgendaGroupKey;
  cliente: CarteiraClient;
  motivo: string;
  prazo: string;
  status: CarteiraClient["status"];
  classificacao: CarteiraClient["nivel"];
  canComplete?: boolean;
};

export type LoadAgendaStatus =
  | "available"
  | "unconfigured"
  | "empty"
  | "error";

export type LoadAgendaResult = {
  status: LoadAgendaStatus;
  clients: CarteiraClient[];
  items: AgendaItem[];
  message?: string;
};

export type AgendaMutationStatus = "saved" | "local_fallback" | "error";

export type AgendaMutationResult = {
  status: AgendaMutationStatus;
  message: string;
};

export type RescheduleFollowUpInput = {
  followUpId: string | undefined;
  dueDate: string;
};

export type CompleteFollowUpInput = {
  followUpId: string | undefined;
};
