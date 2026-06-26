import type { CarteiraClient } from "@/features/carteira/types";

export type RelatoriosSourceStatus =
  | "available"
  | "unconfigured"
  | "empty"
  | "error";

export type ChannelLabel = "WhatsApp" | "Telefone" | "E-mail" | "Presencial";
export type ClientTypeLabel = "Loja" | "Externo" | "Novo" | "Espontaneo";

export type WorkedRow = {
  id: string;
  client: CarteiraClient;
  canal: ChannelLabel;
  dataInteracao: string;
};

export type ConvertedRow = {
  id: string;
  client: CarteiraClient;
  valorRecuperado: number;
  dataConversao: string;
  origem: ClientTypeLabel;
};

export type SellerPerformanceRow = {
  vendedor: string;
  contatos: number;
  convertidos: number;
  taxaConversao: number;
  visitas: number;
  valorRecuperado: number;
  pendencias: number;
  followUpsVencidos: number;
  pontos: number;
};

export type FollowUpRow = {
  id: string;
  client: CarteiraClient;
  prazo: string;
  status: "Aberto" | "Em atraso" | "Concluido";
  motivo: string;
  situacao: "Em atraso" | "No prazo";
};

export type PointRow = {
  id: string;
  client: CarteiraClient | null;
  vendedor: string;
  pontos: number;
  acao: string;
  descricao: string;
  origem: string;
  data: string;
};

export type LoadRelatoriosResult = {
  status: RelatoriosSourceStatus;
  clients: CarteiraClient[];
  workedRows: WorkedRow[];
  convertedRows: ConvertedRow[];
  followUpRows: FollowUpRow[];
  pointRows: PointRow[];
  message?: string;
};
