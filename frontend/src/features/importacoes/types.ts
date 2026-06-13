import type { CarteiraClient, ClientLevel } from "@/features/carteira/types";

export type ImportStatus = "rascunho" | "validada" | "publicada" | "erro";

export type ImportStep = "upload" | "validacao" | "preview" | "publicacao";

export type ImportColumnKey =
  | "razaoSocial"
  | "nomeFantasia"
  | "email"
  | "telefone"
  | "cidade"
  | "estado"
  | "dataUltimoPedido"
  | "vendedorUltimoPedido"
  | "valorUltimoPedido"
  | "diasSemComprar"
  | "cicloMedioCompra"
  | "proximaCompraPrevista"
  | "situacao"
  | "bairro"
  | "cep"
  | "endereco";

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
  telefone: string;
  email: string;
  cidade: string;
  estado: string;
  bairro: string;
  endereco: string;
  cep: string;
  vendedor: string;
  ultimoPedido: string | null;
  valorUltimoPedido: number;
  diasSemComprar: number;
  cicloMedioCompraDias: number | null;
  proximaCompra: string | null;
  situacao: string;
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
