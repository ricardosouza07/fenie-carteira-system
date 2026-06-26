import type { CarteiraClient } from "@/features/carteira/types";
import type { MonthlyGamificationSummary } from "@/features/gamification/types";

export type DashboardSourceStatus =
  | "available"
  | "unconfigured"
  | "empty"
  | "error";

export type DashboardMetrics = {
  totalClientes: number;
  saudaveis: number;
  atencao: number;
  risco: number;
  inativosAntigos: number;
  trabalhadosMes: number;
  naoTrabalhados: number;
  convertidos: number;
  valorRecuperado: number;
  aguardandoRetorno: number;
  visitasEncaminhadas: number;
  followUpsVencidos: number;
  followUpsHoje: number;
  contatosRealizados: number;
  pontosMes: number;
  clientesInadimplentes: number;
  clientesBloqueados: number;
  negociacoesFinanceiras: number;
};

export type DashboardSellerPerformance = {
  vendedor: string;
  trabalhados: number;
  contatos: number;
  convertidos: number;
  taxaConversao: number;
  visitas: number;
  valorRecuperado: number;
  pendencias: number;
  followUpsVencidos: number;
  pontos: number;
};

export type DashboardPriority = {
  client: CarteiraClient;
  motivo: string;
  score: number;
};

export type LoadDashboardResult = {
  status: DashboardSourceStatus;
  clients: CarteiraClient[];
  metrics: DashboardMetrics | null;
  sellerRows: DashboardSellerPerformance[];
  priorityRows: DashboardPriority[];
  gamificationSummary: MonthlyGamificationSummary | null;
  metricErrors?: string[];
  message?: string;
};
