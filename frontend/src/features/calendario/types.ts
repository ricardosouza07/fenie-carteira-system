import type { CarteiraClient } from "@/features/carteira/types";

export type CalendarViewMode = "mes" | "semana";

export type CalendarEventType =
  | "proxima_compra"
  | "follow_up"
  | "visita"
  | "vencido"
  | "convertido";

export type EventTypeFilter = "todos" | CalendarEventType;

export type CalendarEventSource =
  | "follow_up"
  | "proxima_compra"
  | "interaction"
  | "status";

export type CalendarEvent = {
  id: string;
  type: CalendarEventType;
  source: CalendarEventSource;
  date: string;
  client: CarteiraClient;
  customerHref: string;
  title: string;
  description: string;
  statusLabel: string;
  followUpId?: string;
  canReschedule: boolean;
  canComplete: boolean;
};

export type LoadCalendarioStatus =
  | "available"
  | "unconfigured"
  | "empty"
  | "error";

export type LoadCalendarioResult = {
  status: LoadCalendarioStatus;
  clients: CarteiraClient[];
  events: CalendarEvent[];
  message?: string;
};
