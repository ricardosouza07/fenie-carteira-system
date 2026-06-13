import type { CarteiraClient, CarteiraInteraction } from "@/features/carteira/types";

export type ClienteDetailSourceStatus =
  | "available"
  | "unconfigured"
  | "not_found"
  | "error";

export type ClienteDetailFollowUp = {
  id: string;
  status: "aberto" | "vencido" | "concluido";
  dataPrevista: string;
  observacao: string;
  origem?: string | null;
};

export type ClienteDetailPointEvent = {
  id: string;
  acao: string;
  pontos: number;
  descricao: string;
  data: string;
  origem: string;
};

export type LoadClienteDetailResult = {
  status: ClienteDetailSourceStatus;
  client: CarteiraClient | null;
  interactions: CarteiraInteraction[];
  followUps: ClienteDetailFollowUp[];
  pointEvents: ClienteDetailPointEvent[];
  message?: string;
};
