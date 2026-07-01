import type { StatusKind } from "@/components/shared/status-badge";

export type ClientLevel = Extract<
  StatusKind,
  "saudavel" | "atencao" | "risco" | "inativo"
>;

export type WorkStatus = Extract<
  StatusKind,
  "nao_trabalhado" | "contatado" | "aguardando" | "convertido" | "visita"
>;

export type FinancialStatus = Extract<
  StatusKind,
  "adimplente" | "inadimplente" | "bloqueado" | "negociacao"
>;

export type PortfolioStatus =
  | "ativo"
  | "fechou_salao"
  | "mudou_de_ramo"
  | "sem_potencial"
  | "duplicado"
  | "arquivado";

export type ContactStatus = Extract<
  WorkStatus,
  "contatado" | "aguardando" | "convertido" | "visita"
>;

export type ClientType = "loja" | "externo" | "novo" | "espontaneo";

export type ContactChannel = "whatsapp" | "telefone" | "email" | "presencial";

export type CarteiraInteraction = {
  id: string;
  clienteId: string;
  status: ContactStatus;
  tipo: ClientType;
  canal: ContactChannel;
  observacao: string | null;
  valorRecuperado: number | null;
  proximoFollowUp: string | null;
  criadoEm: string;
};

export type CarteiraInteractionInput = Omit<
  CarteiraInteraction,
  "id" | "criadoEm"
>;

export type CarteiraClient = {
  id: string;
  portfolioItemId?: string;
  vendedorId?: string;
  nivel: ClientLevel;
  cliente: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  documento?: string;
  inscricaoEstadual?: string;
  email?: string;
  telefone: string;
  cidade: string;
  bairro: string;
  cep?: string;
  endereco?: string;
  diasSemComprar: number;
  cicloMedioCompraDias?: number;
  proximaCompra: string | null;
  ultimoPedidoNumero?: string;
  ultimoPedido: string | null;
  valorUltimoPedido: number;
  vendedor: string;
  vendedorUltimoPedido?: string;
  situacaoOriginal?: string;
  dataCadastro?: string | null;
  origemCadastro?: string;
  acessoB2B?: string;
  segmento?: string;
  tagsCliente?: string;
  proximaTarefa?: string;
  dataTarefa?: string | null;
  situacaoFinanceira: FinancialStatus;
  observacaoFinanceira?: string | null;
  situacaoCarteira: PortfolioStatus;
  observacaoCarteira?: string | null;
  status: WorkStatus;
  ultimaAcao: {
    tipo: string;
    data: string | null;
  };
  interacoes?: CarteiraInteraction[];
};
