import type { CarteiraClient, ClientLevel } from "@/features/carteira/types";

export type ImportStatus = "rascunho" | "validada" | "publicada" | "erro";

export type ImportStep = "upload" | "validacao" | "preview" | "publicacao";

export type ImportColumnKey =
  | "razaoSocial"
  | "nomeFantasia"
  | "documento"
  | "inscricaoEstadual"
  | "email"
  | "telefone"
  | "cidade"
  | "estado"
  | "ultimoPedidoNumero"
  | "dataUltimoPedido"
  | "vendedorUltimoPedido"
  | "valorUltimoPedido"
  | "diasSemComprar"
  | "cicloMedioCompra"
  | "proximaCompraPrevista"
  | "situacao"
  | "dataCadastro"
  | "origemCadastro"
  | "bairro"
  | "cep"
  | "endereco"
  | "acessoB2B"
  | "segmento"
  | "tagsCliente"
  | "proximaTarefa"
  | "dataTarefa";

export type RecognizedColumn = {
  key: ImportColumnKey;
  label: string;
  source: string;
  index: number;
};

export type ImportPreviewRow = {
  id: string;
  rowNumber: number;
  cliente: string;
  razaoSocial: string;
  nomeFantasia: string;
  documento: string;
  documentoNormalizado: string;
  inscricaoEstadual: string;
  telefone: string;
  telefoneNormalizado: string;
  telefonesNormalizados: string[];
  email: string;
  cidade: string;
  cidadeNormalizada: string;
  estado: string;
  bairro: string;
  endereco: string;
  cep: string;
  vendedor: string;
  vendedorNormalizado: string;
  ultimoPedidoNumero: string;
  ultimoPedido: string | null;
  valorUltimoPedido: number;
  diasSemComprar: number;
  cicloMedioCompraDias: number | null;
  proximaCompra: string | null;
  situacao: string;
  dataCadastro: string | null;
  origemCadastro: string;
  acessoB2B: string;
  segmento: string;
  tagsCliente: string;
  proximaTarefa: string;
  dataTarefa: string | null;
  razaoSocialNormalizada: string;
  nomeFantasiaNormalizado: string;
  nivel: ClientLevel;
  classificacaoCalculada: string;
  isValid: boolean;
  invalidReasons: string[];
  duplicateKey: string | null;
};

export type ParsedImportResult = {
  fileName: string;
  sheetName: string;
  headerRowIndex: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  possibleDuplicates: number;
  uniqueClients: number;
  recognizedColumns: RecognizedColumn[];
  unrecognizedColumns: string[];
  rows: ImportPreviewRow[];
  clients: CarteiraClient[];
};

export type ImportRecord = {
  id: string;
  arquivo: string;
  criadoEm: string;
  status: ImportStatus;
  totalLinhas: number;
  linhasValidas: number;
  linhasInvalidas: number;
  duplicados: number;
  colunasReconhecidas: number;
  colunasNaoReconhecidas: number;
  publicadoEm?: string;
  mensagem?: string;
  usuario?: string;
  origem?: "supabase" | "local" | "mock";
};
