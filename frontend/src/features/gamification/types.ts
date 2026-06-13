import type {
  CarteiraClient,
  CarteiraInteraction,
  CarteiraInteractionInput,
} from "@/features/carteira/types";

export type PointAction =
  | "contatado"
  | "aguardando_retorno"
  | "visita_encaminhada"
  | "convertido"
  | "cliente_novo"
  | "pedido_espontaneo"
  | "reativacao_inativo_antigo"
  | "follow_up_no_prazo";

export type PointEventOrigin =
  | "mock_seed"
  | "interaction_drawer"
  | "agenda_follow_up"
  | "interaction";

export type PointEvent = {
  id: string;
  vendedor: string;
  userId: string;
  customerId: string;
  acao: PointAction;
  pontos: number;
  data: string;
  descricao: string;
  origem: PointEventOrigin;
  valorRecuperado?: number;
};

export type CampaignStatus = "ativa" | "inativa";

export type AchievementLevel = {
  id: string;
  nome: string;
  pontos: number;
  premio: string;
  descricao: string;
  ativo: boolean;
};

export type PerformanceCampaign = {
  id: string;
  nome: string;
  mesAno: string;
  periodoInicial: string;
  periodoFinal: string;
  status: CampaignStatus;
  marcos: AchievementLevel[];
  atualizadoEm: string;
};

export type SellerScore = {
  vendedor: string;
  userId: string;
  pontos: number;
  contatos: number;
  conversoes: number;
  valorRecuperado: number;
  nivelAtual: AchievementLevel | null;
};

export type MonthlyGamificationSummary = {
  mes: string;
  totalPoints: number;
  progressPercent: number;
  currentLevel: AchievementLevel | null;
  nextLevel: AchievementLevel | null;
  nextPrizeLevel: AchievementLevel | null;
  activeLevels: AchievementLevel[];
  achievedLevels: AchievementLevel[];
  achievedPrizeLevels: AchievementLevel[];
  futureLevels: AchievementLevel[];
  sellerScores: SellerScore[];
  recentEvents: PointEvent[];
  lastEvent: PointEvent | null;
  campaign: PerformanceCampaign;
};

export type InteractionPointInput = {
  client: CarteiraClient;
  interaction: CarteiraInteraction | CarteiraInteractionInput;
  createdAt: string;
  origem?: PointEventOrigin;
};
