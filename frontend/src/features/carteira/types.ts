import type { StatusKind } from "@/components/shared/status-badge";

export type ClientLevel = Extract<
  StatusKind,
  "saudavel" | "atencao" | "risco" | "inativo"
>;

export type WorkStatus = Extract<
  StatusKind,
  "nao_trabalhado" | "contatado" | "aguardando" | "convertido" | "visita"
>;

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
  email?: string;
  telefone: string;
  cidade: string;
  bairro: string;
  cep?: string;
  endereco?: string;
  diasSemComprar: number;
  cicloMedioCompraDias?: number;
  proximaCompra: string | null;
  ultimoPedido: string | null;
  valorUltimoPedido: number;
  vendedor: string;
  vendedorUltimoPedido?: string;
  situacaoOriginal?: string;
  status: WorkStatus;
  ultimaAcao: {
    tipo: string;
    data: string | null;
  };
  interacoes?: CarteiraInteraction[];
};
