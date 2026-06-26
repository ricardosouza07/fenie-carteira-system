import * as XLSX from "xlsx";

import type { CarteiraClient, ClientLevel } from "@/features/carteira/types";
import {
  calculateClientHealthStatus,
  getClientHealthLabel,
} from "@/features/carteira/operational-rules";
import { getCurrentPeriod } from "@/lib/current-period";

import type {
  ImportColumnKey,
  ImportPreviewRow,
  ParsedImportResult,
  RecognizedColumn,
} from "./types";

const TODAY = getCurrentPeriod().date;
const HEADER_SCAN_LIMIT = 40;

const columnLabels: Record<ImportColumnKey, string> = {
  razaoSocial: "Razão Social",
  nomeFantasia: "Nome fantasia",
  documento: "CNPJ/CPF",
  inscricaoEstadual: "Inscrição Estadual",
  email: "E-mail",
  telefone: "Telefone",
  cidade: "Cidade",
  estado: "Estado",
  ultimoPedidoNumero: "Último pedido",
  dataUltimoPedido: "Data do último pedido",
  vendedorUltimoPedido: "Vendedor do último pedido",
  valorUltimoPedido: "Valor do último pedido",
  diasSemComprar: "Dias sem comprar",
  cicloMedioCompra: "Ciclo médio de compra",
  proximaCompraPrevista: "Próxima compra prevista",
  situacao: "Situação",
  dataCadastro: "Data de cadastro",
  origemCadastro: "Origem do cadastro",
  bairro: "Bairro",
  cep: "CEP",
  endereco: "Endereço",
  acessoB2B: "Acesso B2B",
  segmento: "Segmento",
  tagsCliente: "Tags de cliente",
  proximaTarefa: "Próxima tarefa",
  dataTarefa: "Data da tarefa",
};

const columnSynonyms: Record<ImportColumnKey, string[]> = {
  razaoSocial: ["razao social", "razão social", "cliente", "nome cliente"],
  nomeFantasia: ["nome fantasia", "fantasia", "apelido", "nome comercial"],
  documento: ["cnpj/cpf", "cpf/cnpj", "cnpj cpf", "cpf", "cnpj", "documento"],
  inscricaoEstadual: [
    "inscricao estadual",
    "inscrição estadual",
    "ie",
    "insc estadual",
  ],
  email: ["e-mail", "email", "mail"],
  telefone: ["telefone", "celular", "fone", "whatsapp", "whats app"],
  cidade: ["cidade", "municipio", "município"],
  estado: ["estado", "uf"],
  ultimoPedidoNumero: [
    "ultimo pedido",
    "último pedido",
    "numero do ultimo pedido",
    "número do último pedido",
    "numero pedido",
    "pedido",
  ],
  dataUltimoPedido: [
    "data do ultimo pedido",
    "data do último pedido",
    "dt ultimo pedido",
    "data ultima compra",
    "data última compra",
  ],
  vendedorUltimoPedido: [
    "vendedor do ultimo pedido",
    "vendedor do último pedido",
    "vendedor ultimo pedido",
    "vendedor última compra",
    "vendedor",
    "representante",
  ],
  valorUltimoPedido: [
    "valor do ultimo pedido",
    "valor do último pedido",
    "valor ultimo pedido",
    "valor última compra",
    "valor",
    "total pedido",
  ],
  diasSemComprar: [
    "dias sem comprar",
    "dias sem compra",
    "dias sem pedido",
    "dias inativo",
  ],
  cicloMedioCompra: [
    "ciclo medio de compra",
    "ciclo médio de compra",
    "ciclo medio",
    "ciclo médio",
    "periodicidade",
  ],
  proximaCompraPrevista: [
    "proxima compra prevista",
    "próxima compra prevista",
    "proxima compra",
    "próxima compra",
    "previsao recompra",
    "previsão recompra",
  ],
  situacao: ["situacao", "situação", "status", "situacao original"],
  dataCadastro: ["data de cadastro", "cadastro em", "dt cadastro"],
  origemCadastro: ["origem do cadastro", "origem cadastro"],
  bairro: ["bairro", "distrito"],
  cep: ["cep", "codigo postal", "código postal"],
  endereco: ["endereco", "endereço", "logradouro", "rua"],
  acessoB2B: ["acesso b2b", "b2b"],
  segmento: ["segmento", "segmento cliente"],
  tagsCliente: ["tags de cliente", "tag cliente", "tags", "tag"],
  proximaTarefa: ["proxima tarefa", "próxima tarefa", "tarefa"],
  dataTarefa: ["data da tarefa", "dt tarefa", "prazo tarefa"],
};

const normalizedSynonyms = Object.fromEntries(
  Object.entries(columnSynonyms).map(([key, synonyms]) => [
    key,
    synonyms.map(normalizeHeader),
  ]),
) as Record<ImportColumnKey, string[]>;

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactHeader(value: unknown) {
  return normalizeHeader(value).replace(/\s+/g, "");
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cellText(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value ?? "").trim();
}

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeDocument(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeSinglePhone(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }

  return digits;
}

function normalizePhoneList(value: string) {
  return value
    .split(/[,;/|]+/)
    .map((phone) => normalizeSinglePhone(phone))
    .filter((phone) => phone.length >= 8);
}

function primaryPhone(value: string) {
  const [firstPhone] = value.split(/[,;/|]+/).map(collapseWhitespace);

  return firstPhone || collapseWhitespace(value);
}

function normalizeState(value: string) {
  return collapseWhitespace(value).toUpperCase();
}

function normalizeSellerName(value: string) {
  return collapseWhitespace(value);
}

function recognizeColumn(value: unknown): ImportColumnKey | null {
  const normalized = normalizeHeader(value);
  const compact = compactHeader(value);

  if (!normalized) {
    return null;
  }

  const entries = Object.entries(normalizedSynonyms) as Array<
    [ImportColumnKey, string[]]
  >;

  for (const [key, synonyms] of entries) {
    for (const synonym of synonyms) {
      const compactSynonym = synonym.replace(/\s+/g, "");

      if (normalized === synonym || compact === compactSynonym) {
        return key;
      }
    }
  }

  const partialMatches = entries.flatMap(([key, synonyms]) =>
    synonyms
      .filter((synonym) => {
        const compactSynonym = synonym.replace(/\s+/g, "");

        return (
          normalized.includes(synonym) || compact.includes(compactSynonym)
        );
      })
      .map((synonym) => ({
        key,
        length: synonym.replace(/\s+/g, "").length,
      })),
  );

  return partialMatches.sort((first, second) => second.length - first.length)[0]
    ?.key ?? null;
}

function rowHasContent(row: unknown[]) {
  return row.some((cell) => cellText(cell) !== "");
}

function findHeaderRow(rows: unknown[][]) {
  let bestIndex = -1;
  let bestScore = 0;

  rows.slice(0, HEADER_SCAN_LIMIT).forEach((row, index) => {
    const recognized = new Set<ImportColumnKey>();

    row.forEach((cell) => {
      const key = recognizeColumn(cell);

      if (key) {
        recognized.add(key);
      }
    });

    let score = recognized.size;

    if (recognized.has("telefone")) {
      score += 2;
    }

    if (recognized.has("cidade")) {
      score += 1;
    }

    if (recognized.has("razaoSocial") || recognized.has("nomeFantasia")) {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  if (bestIndex === -1 || bestScore < 4) {
    throw new Error(
      "Não foi possível detectar a linha de cabeçalho. Verifique se a planilha possui colunas como Razão Social, Telefone, Cidade ou Dias sem comprar.",
    );
  }

  return bestIndex;
}

function buildColumnMap(headerRow: unknown[]) {
  const recognizedColumns: RecognizedColumn[] = [];
  const unrecognizedColumns: string[] = [];
  const fieldToIndex = new Map<ImportColumnKey, number>();

  headerRow.forEach((cell, index) => {
    const source = cellText(cell);

    if (!source) {
      return;
    }

    const key = recognizeColumn(source);

    if (key && !fieldToIndex.has(key)) {
      fieldToIndex.set(key, index);
      recognizedColumns.push({
        key,
        label: columnLabels[key],
        source,
        index,
      });
      return;
    }

    unrecognizedColumns.push(source);
  });

  return {
    fieldToIndex,
    recognizedColumns,
    unrecognizedColumns,
  };
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = cellText(value);

  if (!text) {
    return null;
  }

  const cleaned = text
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: unknown) {
  const parsed = parseNumber(value);

  return parsed === null ? null : Math.max(0, Math.round(parsed));
}

function excelSerialToDate(value: number) {
  const parsed = XLSX.SSF.parse_date_code(value);

  if (!parsed) {
    return null;
  }

  const month = String(parsed.m).padStart(2, "0");
  const day = String(parsed.d).padStart(2, "0");

  return `${parsed.y}-${month}-${day}`;
}

function parseDateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return excelSerialToDate(value);
  }

  const text = cellText(value);

  if (!text) {
    return null;
  }

  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);

  if (isoMatch) {
    const [, year, month, day] = isoMatch;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const brMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);

  if (brMatch) {
    const [, day, month, rawYear] = brMatch;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function addDays(date: string, days: number) {
  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  parsedDate.setUTCDate(parsedDate.getUTCDate() + days);

  return parsedDate.toISOString().slice(0, 10);
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

function classifyClient(days: number): {
  nivel: ClientLevel;
  label: string;
} {
  const nivel = calculateClientHealthStatus(days);

  return { nivel, label: getClientHealthLabel(nivel) };
}

function getRowValue(
  row: unknown[],
  fieldToIndex: Map<ImportColumnKey, number>,
  key: ImportColumnKey,
) {
  const index = fieldToIndex.get(key);

  return index === undefined ? "" : row[index];
}

function duplicateKeyFor(row: ImportPreviewRow) {
  const [phoneDigits] = row.telefonesNormalizados;

  if (phoneDigits) {
    return `tel:${phoneDigits}`;
  }

  if (row.documentoNormalizado.length >= 11) {
    return `doc:${row.documentoNormalizado}`;
  }

  if (row.razaoSocialNormalizada) {
    return `razao:${row.razaoSocialNormalizada}`;
  }

  if (row.nomeFantasiaNormalizado && row.cidadeNormalizada) {
    return `fantasia:${row.nomeFantasiaNormalizado}:${row.cidadeNormalizada}`;
  }

  return null;
}

function buildClient(importId: string, row: ImportPreviewRow): CarteiraClient {
  return {
    id: `${importId}-row-${row.rowNumber}`,
    nivel: row.nivel,
    cliente: row.nomeFantasia || row.razaoSocial || row.cliente,
    razaoSocial: row.razaoSocial || undefined,
    nomeFantasia: row.nomeFantasia || undefined,
    documento: row.documento || undefined,
    inscricaoEstadual: row.inscricaoEstadual || undefined,
    telefone: row.telefone || "-",
    cidade: row.cidade || "-",
    bairro: row.bairro || "-",
    cep: row.cep || undefined,
    endereco: row.endereco || undefined,
    diasSemComprar: row.diasSemComprar,
    cicloMedioCompraDias: row.cicloMedioCompraDias ?? undefined,
    proximaCompra: row.proximaCompra,
    ultimoPedidoNumero: row.ultimoPedidoNumero || undefined,
    ultimoPedido: row.ultimoPedido,
    valorUltimoPedido: row.valorUltimoPedido,
    vendedor: row.vendedor || "Sem vendedor",
    vendedorUltimoPedido: row.vendedor || undefined,
    situacaoOriginal: row.situacao || undefined,
    dataCadastro: row.dataCadastro,
    origemCadastro: row.origemCadastro || undefined,
    acessoB2B: row.acessoB2B || undefined,
    segmento: row.segmento || undefined,
    tagsCliente: row.tagsCliente || undefined,
    proximaTarefa: row.proximaTarefa || undefined,
    dataTarefa: row.dataTarefa,
    situacaoFinanceira: "adimplente",
    observacaoFinanceira: null,
    status: "nao_trabalhado",
    ultimaAcao: { tipo: "Importado da planilha", data: null },
  };
}

export async function parseImportFile(
  file: File,
  importId: string,
): Promise<ParsedImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    raw: true,
  });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("A planilha não possui abas para leitura.");
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: true,
  });
  const headerRowIndex = findHeaderRow(rows);
  const { fieldToIndex, recognizedColumns, unrecognizedColumns } =
    buildColumnMap(rows[headerRowIndex] ?? []);
  const dataRows = rows.slice(headerRowIndex + 1).filter(rowHasContent);
  const previewRows = dataRows.map<ImportPreviewRow>((row, rowIndex) => {
    const razaoSocial = collapseWhitespace(
      cellText(getRowValue(row, fieldToIndex, "razaoSocial")),
    );
    const nomeFantasia = cellText(
      getRowValue(row, fieldToIndex, "nomeFantasia"),
    );
    const normalizedNomeFantasia = collapseWhitespace(nomeFantasia);
    const documento = collapseWhitespace(
      cellText(getRowValue(row, fieldToIndex, "documento")),
    );
    const documentoNormalizado = normalizeDocument(documento);
    const telefoneRaw = cellText(getRowValue(row, fieldToIndex, "telefone"));
    const telefone = primaryPhone(telefoneRaw);
    const telefonesNormalizados = normalizePhoneList(telefoneRaw);
    const telefoneNormalizado = telefonesNormalizados[0] ?? "";
    const cidade = collapseWhitespace(
      cellText(getRowValue(row, fieldToIndex, "cidade")),
    );
    const cidadeNormalizada = normalizeText(cidade);
    const bairro = collapseWhitespace(
      cellText(getRowValue(row, fieldToIndex, "bairro")),
    );
    const ultimoPedido = parseDateValue(
      getRowValue(row, fieldToIndex, "dataUltimoPedido"),
    );
    const parsedDiasSemComprar = parseInteger(
      getRowValue(row, fieldToIndex, "diasSemComprar"),
    );
    const cicloMedioCompraDias = parseInteger(
      getRowValue(row, fieldToIndex, "cicloMedioCompra"),
    );
    const diasSemComprar =
      parsedDiasSemComprar ??
      (ultimoPedido ? daysBetween(ultimoPedido, TODAY) : null) ??
      0;
    const proximaCompra =
      parseDateValue(getRowValue(row, fieldToIndex, "proximaCompraPrevista")) ??
      (ultimoPedido && cicloMedioCompraDias
        ? addDays(ultimoPedido, cicloMedioCompraDias)
        : null);
    const classification = classifyClient(diasSemComprar);
    const cliente = normalizedNomeFantasia || razaoSocial;
    const vendedor = normalizeSellerName(
      cellText(getRowValue(row, fieldToIndex, "vendedorUltimoPedido")),
    );
    const invalidReasons: string[] = [];

    if (!cliente) {
      invalidReasons.push("Cliente sem razão social ou nome fantasia");
    }

    if (!telefone && !documentoNormalizado && !cidade) {
      invalidReasons.push(
        "Informe telefone, CNPJ/CPF ou cidade para localizar o cliente",
      );
    }

    if (parsedDiasSemComprar === null && !ultimoPedido) {
      invalidReasons.push(
        "Informe Dias sem comprar ou Data do último pedido para classificar",
      );
    }

    const previewRow: ImportPreviewRow = {
      id: `${importId}-preview-${rowIndex + 1}`,
      rowNumber: headerRowIndex + rowIndex + 2,
      cliente: cliente || "Cliente sem nome",
      razaoSocial,
      nomeFantasia: normalizedNomeFantasia,
      documento,
      documentoNormalizado,
      inscricaoEstadual: collapseWhitespace(
        cellText(getRowValue(row, fieldToIndex, "inscricaoEstadual")),
      ),
      telefone,
      telefoneNormalizado,
      telefonesNormalizados,
      email: cellText(getRowValue(row, fieldToIndex, "email")),
      cidade,
      cidadeNormalizada,
      estado: normalizeState(cellText(getRowValue(row, fieldToIndex, "estado"))),
      bairro,
      endereco: collapseWhitespace(
        cellText(getRowValue(row, fieldToIndex, "endereco")),
      ),
      cep: cellText(getRowValue(row, fieldToIndex, "cep")),
      vendedor,
      vendedorNormalizado: normalizeText(vendedor),
      ultimoPedidoNumero: cellText(
        getRowValue(row, fieldToIndex, "ultimoPedidoNumero"),
      ),
      ultimoPedido,
      valorUltimoPedido:
        parseNumber(getRowValue(row, fieldToIndex, "valorUltimoPedido")) ?? 0,
      diasSemComprar,
      cicloMedioCompraDias,
      proximaCompra,
      situacao: cellText(getRowValue(row, fieldToIndex, "situacao")),
      dataCadastro: parseDateValue(
        getRowValue(row, fieldToIndex, "dataCadastro"),
      ),
      origemCadastro: cellText(getRowValue(row, fieldToIndex, "origemCadastro")),
      acessoB2B: cellText(getRowValue(row, fieldToIndex, "acessoB2B")),
      segmento: cellText(getRowValue(row, fieldToIndex, "segmento")),
      tagsCliente: cellText(getRowValue(row, fieldToIndex, "tagsCliente")),
      proximaTarefa: cellText(getRowValue(row, fieldToIndex, "proximaTarefa")),
      dataTarefa: parseDateValue(getRowValue(row, fieldToIndex, "dataTarefa")),
      razaoSocialNormalizada: normalizeText(razaoSocial),
      nomeFantasiaNormalizado: normalizeText(normalizedNomeFantasia),
      nivel: classification.nivel,
      classificacaoCalculada: classification.label,
      isValid: invalidReasons.length === 0,
      invalidReasons,
      duplicateKey: null,
    };

    return {
      ...previewRow,
      duplicateKey: duplicateKeyFor(previewRow),
    };
  });
  const duplicateMap = new Map<string, number>();

  previewRows.forEach((row) => {
    if (row.isValid && row.duplicateKey) {
      duplicateMap.set(
        row.duplicateKey,
        (duplicateMap.get(row.duplicateKey) ?? 0) + 1,
      );
    }
  });

  const possibleDuplicates = previewRows.filter(
    (row) => row.duplicateKey && (duplicateMap.get(row.duplicateKey) ?? 0) > 1,
  ).length;
  const validRows = previewRows.filter((row) => row.isValid);
  const uniqueClients = new Set(
    validRows.map((row) => row.duplicateKey ?? `row:${row.rowNumber}`),
  ).size;

  return {
    fileName: file.name,
    sheetName,
    headerRowIndex,
    totalRows: previewRows.length,
    validRows: validRows.length,
    invalidRows: previewRows.length - validRows.length,
    possibleDuplicates,
    uniqueClients,
    recognizedColumns,
    unrecognizedColumns,
    rows: previewRows,
    clients: validRows.map((row) => buildClient(importId, row)),
  };
}
