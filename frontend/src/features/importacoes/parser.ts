import * as XLSX from "xlsx";

import type { CarteiraClient, ClientLevel } from "@/features/carteira/types";
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
  email: "E-mail",
  telefone: "Telefone",
  cidade: "Cidade",
  estado: "Estado",
  dataUltimoPedido: "Data do último pedido",
  vendedorUltimoPedido: "Vendedor do último pedido",
  valorUltimoPedido: "Valor do último pedido",
  diasSemComprar: "Dias sem comprar",
  cicloMedioCompra: "Ciclo médio de compra",
  proximaCompraPrevista: "Próxima compra prevista",
  situacao: "Situação",
  bairro: "Bairro",
  cep: "CEP",
  endereco: "Endereço",
};

const columnSynonyms: Record<ImportColumnKey, string[]> = {
  razaoSocial: ["razao social", "razão social", "cliente", "nome cliente"],
  nomeFantasia: ["nome fantasia", "fantasia", "apelido", "nome comercial"],
  email: ["e-mail", "email", "mail"],
  telefone: ["telefone", "celular", "fone", "whatsapp", "whats app"],
  cidade: ["cidade", "municipio", "município"],
  estado: ["estado", "uf"],
  dataUltimoPedido: [
    "data do ultimo pedido",
    "data do último pedido",
    "ultimo pedido",
    "último pedido",
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
  bairro: ["bairro", "distrito"],
  cep: ["cep", "codigo postal", "código postal"],
  endereco: ["endereco", "endereço", "logradouro", "rua"],
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
    .trim();
}

function cellText(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value ?? "").trim();
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
  if (days <= 30) {
    return { nivel: "saudavel", label: "Saudável" };
  }

  if (days <= 60) {
    return { nivel: "atencao", label: "Atenção" };
  }

  if (days <= 89) {
    return { nivel: "risco", label: "Risco" };
  }

  return { nivel: "inativo", label: "Inativo antigo" };
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
  const phoneDigits = row.telefone.replace(/\D/g, "");

  if (phoneDigits.length >= 8) {
    return `tel:${phoneDigits}`;
  }

  const name = normalizeText(`${row.razaoSocial} ${row.nomeFantasia}`);

  if (!name) {
    return null;
  }

  return `nome:${name}:${normalizeText(row.cidade)}`;
}

function buildClient(importId: string, row: ImportPreviewRow): CarteiraClient {
  return {
    id: `${importId}-row-${row.rowNumber}`,
    nivel: row.nivel,
    cliente: row.nomeFantasia || row.razaoSocial || row.cliente,
    razaoSocial: row.razaoSocial || undefined,
    nomeFantasia: row.nomeFantasia || undefined,
    telefone: row.telefone || "-",
    cidade: row.cidade || "-",
    bairro: row.bairro || "-",
    cep: row.cep || undefined,
    endereco: row.endereco || undefined,
    diasSemComprar: row.diasSemComprar,
    cicloMedioCompraDias: row.cicloMedioCompraDias ?? undefined,
    proximaCompra: row.proximaCompra,
    ultimoPedido: row.ultimoPedido,
    valorUltimoPedido: row.valorUltimoPedido,
    vendedor: row.vendedor || "Sem vendedor",
    vendedorUltimoPedido: row.vendedor || undefined,
    situacaoOriginal: row.situacao || undefined,
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
    const razaoSocial = cellText(getRowValue(row, fieldToIndex, "razaoSocial"));
    const nomeFantasia = cellText(
      getRowValue(row, fieldToIndex, "nomeFantasia"),
    );
    const telefone = cellText(getRowValue(row, fieldToIndex, "telefone"));
    const cidade = cellText(getRowValue(row, fieldToIndex, "cidade"));
    const bairro = cellText(getRowValue(row, fieldToIndex, "bairro"));
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
    const cliente = nomeFantasia || razaoSocial;
    const invalidReasons: string[] = [];

    if (!cliente) {
      invalidReasons.push("Cliente sem razão social ou nome fantasia");
    }

    if (!telefone && !cidade) {
      invalidReasons.push("Informe telefone ou cidade para localizar o cliente");
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
      nomeFantasia,
      telefone,
      email: cellText(getRowValue(row, fieldToIndex, "email")),
      cidade,
      estado: cellText(getRowValue(row, fieldToIndex, "estado")),
      bairro,
      endereco: cellText(getRowValue(row, fieldToIndex, "endereco")),
      cep: cellText(getRowValue(row, fieldToIndex, "cep")),
      vendedor: cellText(
        getRowValue(row, fieldToIndex, "vendedorUltimoPedido"),
      ),
      ultimoPedido,
      valorUltimoPedido:
        parseNumber(getRowValue(row, fieldToIndex, "valorUltimoPedido")) ?? 0,
      diasSemComprar,
      cicloMedioCompraDias,
      proximaCompra,
      situacao: cellText(getRowValue(row, fieldToIndex, "situacao")),
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

  return {
    fileName: file.name,
    sheetName,
    headerRowIndex,
    totalRows: previewRows.length,
    validRows: validRows.length,
    invalidRows: previewRows.length - validRows.length,
    possibleDuplicates,
    recognizedColumns,
    unrecognizedColumns,
    rows: previewRows,
    clients: validRows.map((row) => buildClient(importId, row)),
  };
}
