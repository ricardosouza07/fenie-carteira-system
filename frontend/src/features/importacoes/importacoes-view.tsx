"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Send,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { listSupabaseImportRecordsAction } from "./actions";
import { parseImportFile } from "./parser";
import type {
  PublishSupabaseImportInput,
  PublishSupabaseImportResult,
} from "./server-types";
import {
  getLocalImportRecords,
  mockImportRecords,
  saveLocalImportRecords,
  savePublishedImportClients,
} from "./storage";
import {
  downloadImportTemplate,
  optionalImportColumns,
  quickImportGuidelines,
  requiredImportColumns,
} from "./template";
import type {
  ImportPreviewRow,
  ImportRecord,
  ImportStatus,
  ImportStep,
  ParsedImportResult,
} from "./types";
import {
  buildImportLimitMessage,
  formatImportFileSize,
  IMPORT_UPLOAD_LIMIT_BYTES,
  IMPORT_UPLOAD_LIMIT_LABEL,
} from "./upload-limits";

type SupabaseLoadState = {
  status: "loading" | "available" | "unconfigured" | "error";
  records: ImportRecord[];
  message: string | null;
};

type ActiveImport = {
  id: string;
  record: ImportRecord;
  result: ParsedImportResult;
};

const steps: { key: ImportStep; label: string; description: string }[] = [
  { key: "upload", label: "Upload", description: "Escolher arquivo" },
  { key: "validacao", label: "Validação", description: "Checar colunas" },
  { key: "preview", label: "Preview", description: "Revisar clientes" },
  { key: "publicacao", label: "Publicação", description: "Gravar dados" },
];

const statusConfig: Record<
  ImportStatus,
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  rascunho: { label: "Rascunho", variant: "muted" },
  validada: { label: "Validada", variant: "info" },
  publicada: { label: "Publicada", variant: "success" },
  erro: { label: "Erro", variant: "danger" },
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  timeZone: "UTC",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function buildImportId() {
  return `imp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDateTime(date: string) {
  return dateTimeFormatter.format(new Date(date));
}

function formatDate(date: string | null) {
  if (!date) {
    return "-";
  }

  return dateFormatter.format(new Date(`${date}T00:00:00.000Z`));
}

function RecordStatusBadge({ status }: { status: ImportStatus }) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getCurrentStepIndex(step: ImportStep) {
  return steps.findIndex((item) => item.key === step);
}

function ImportStepper({ currentStep }: { currentStep: ImportStep }) {
  const currentStepIndex = getCurrentStepIndex(currentStep);

  return (
    <div className="grid gap-2 md:grid-cols-4">
      {steps.map((step, index) => {
        const isCurrent = currentStep === step.key;
        const isDone = index < currentStepIndex;

        return (
          <div
            key={step.key}
            className={cn(
              "rounded-md border bg-background p-3",
              isCurrent && "border-primary/40 bg-accent/55",
              isDone && "border-primary/20",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold",
                  isCurrent && "border-primary bg-primary text-primary-foreground",
                  isDone && "border-primary text-primary",
                )}
              >
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className="text-sm font-semibold">{step.label}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {step.description}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function upsertRecord(records: ImportRecord[], record: ImportRecord) {
  return [
    record,
    ...records.filter((item) => item.id !== record.id),
  ].sort((first, second) => second.criadoEm.localeCompare(first.criadoEm));
}

async function publishSupabaseImportApi(
  input: PublishSupabaseImportInput,
): Promise<PublishSupabaseImportResult> {
  const response = await fetch("/api/importacoes/publicar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => null)) as
    | PublishSupabaseImportResult
    | { message?: string }
    | null;

  if (!response.ok) {
    const message =
      payload?.message ??
      (response.status === 413
        ? `Importacao acima do limite de ${IMPORT_UPLOAD_LIMIT_LABEL}.`
        : "Nao foi possivel publicar a importacao.");

    throw new Error(message);
  }

  return payload as PublishSupabaseImportResult;
}

function UploadGuidance() {
  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_1.4fr_1.2fr]">
      <div className="rounded-md border bg-background p-3">
        <div className="text-xs font-semibold uppercase text-muted-foreground">
          Colunas obrigatórias
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {requiredImportColumns.map((column) => (
            <Badge key={column} variant="info">
              {column}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-md border bg-background p-3">
        <div className="text-xs font-semibold uppercase text-muted-foreground">
          Colunas opcionais
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {optionalImportColumns.map((column) => (
            <Badge key={column} variant="muted">
              {column}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-md border bg-background p-3">
        <div className="text-xs font-semibold uppercase text-muted-foreground">
          Orientações rápidas
        </div>
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          {quickImportGuidelines.map((guideline) => (
            <li key={guideline} className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{guideline}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ImportRecordsList({ records }: { records: ImportRecord[] }) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="Nenhuma importação registrada"
        description="As importações publicadas ou validadas aparecerão aqui."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de importações</CardTitle>
        <CardDescription>
          Acompanhe arquivos importados, validações e publicações reais ou locais.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 md:hidden">
          {records.map((record) => (
            <div key={record.id} className="rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{record.arquivo}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(record.criadoEm)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {record.origem === "supabase"
                      ? `Supabase · ${record.usuario ?? "Serviço"}`
                      : record.origem === "local"
                        ? "Fallback local"
                        : "Mock"}
                  </div>
                </div>
                <RecordStatusBadge status={record.status} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>{record.linhasValidas} válidas</span>
                <span>{record.linhasInvalidas} inválidas</span>
                <span>{record.duplicados} dup.</span>
              </div>
              {record.mensagem ? (
                <div className="mt-3 rounded-md bg-danger-soft px-2 py-1 text-xs text-danger-soft-foreground">
                  {record.mensagem}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <Table className="min-w-[980px] table-density-compact">
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Linhas</TableHead>
                <TableHead className="text-right">Válidas</TableHead>
                <TableHead className="text-right">Inválidas</TableHead>
                <TableHead className="text-right">Duplicados</TableHead>
                <TableHead>Colunas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(record.criadoEm)}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[260px] truncate font-medium">
                      {record.arquivo}
                    </div>
                    {record.mensagem ? (
                      <div className="mt-0.5 max-w-[260px] truncate text-xs text-danger-soft-foreground">
                        {record.mensagem}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="whitespace-nowrap text-sm">
                      {record.usuario ?? "Local/mock"}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {record.origem === "supabase"
                        ? "Supabase"
                        : record.origem === "local"
                          ? "Fallback local"
                          : "Mock"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <RecordStatusBadge status={record.status} />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {record.totalLinhas}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {record.linhasValidas}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {record.linhasInvalidas}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {record.duplicados}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {record.colunasReconhecidas} reconhecidas ·{" "}
                      {record.colunasNaoReconhecidas} não reconhecidas
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SupabaseStatusNotice({ state }: { state: SupabaseLoadState }) {
  if (state.status === "loading") {
    return (
      <div className="mb-4 rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
        Consultando importações reais no Supabase...
      </div>
    );
  }

  if (state.status === "available") {
    return (
      <div className="mb-4 rounded-md border border-success/60 bg-success px-3 py-2 text-sm text-success-foreground">
        Supabase conectado. Novas publicações serão gravadas no banco real.
      </div>
    );
  }

  const message =
    state.message ??
    "Supabase não configurado. A publicação continuará disponível em modo local.";

  return (
    <div className="mb-4 rounded-md border border-warning bg-warning px-3 py-2 text-sm text-warning-foreground">
      {message} O localStorage será usado apenas como fallback temporário.
    </div>
  );
}

function ValidationPanel({ result }: { result: ParsedImportResult }) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Linhas lidas"
          value={String(result.totalRows)}
          hint={`Cabeçalho na linha ${result.headerRowIndex + 1}`}
          icon={FileSpreadsheet}
        />
        <MetricCard
          label="Linhas válidas"
          value={String(result.validRows)}
          hint="Prontas para publicação"
          icon={CheckCircle2}
          tone="success"
        />
        <MetricCard
          label="Clientes únicos"
          value={String(result.uniqueClients)}
          hint="Após cruzamento inicial"
          icon={Eye}
          tone="info"
        />
        <MetricCard
          label="Linhas inválidas"
          value={String(result.invalidRows)}
          hint="Revise antes de publicar"
          icon={AlertCircle}
          tone={result.invalidRows > 0 ? "warning" : "success"}
        />
        <MetricCard
          label="Possíveis duplicados"
          value={String(result.possibleDuplicates)}
          hint="Por telefone ou nome/cidade"
          icon={Eye}
          tone={result.possibleDuplicates > 0 ? "warning" : "default"}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Colunas reconhecidas</CardTitle>
            <CardDescription>
              Campos que serão usados para montar a carteira.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {result.recognizedColumns.map((column) => (
                <Badge key={`${column.key}-${column.index}`} variant="success">
                  {column.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Colunas não reconhecidas</CardTitle>
            <CardDescription>
              Serão ignoradas nesta fase do MVP.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result.unrecognizedColumns.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.unrecognizedColumns.map((column, index) => (
                  <Badge key={`${column}-${index}`} variant="muted">
                    {column}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Todas as colunas preenchidas foram reconhecidas.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PreviewTable({ rows }: { rows: ImportPreviewRow[] }) {
  const sampleRows = rows.slice(0, 12);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview dos clientes</CardTitle>
        <CardDescription>
          Amostra das primeiras linhas lidas. A publicação usa todas as linhas
          válidas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table className="min-w-[980px] table-density-compact">
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade/Bairro</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Último pedido</TableHead>
              <TableHead className="text-right">Dias sem comprar</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Classificação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sampleRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="max-w-[220px]">
                    <div className="truncate font-medium">{row.cliente}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {row.razaoSocial || "Sem razão social"}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.telefone || "-"}
                </TableCell>
                <TableCell>
                  <div className="max-w-[170px]">
                    <div className="truncate">{row.cidade || "-"}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {row.bairro || "-"}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{row.vendedor || "Sem vendedor"}</TableCell>
                <TableCell>
                  <div className="whitespace-nowrap">
                    {formatDate(row.ultimoPedido)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {currencyFormatter.format(row.valorUltimoPedido)}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {row.diasSemComprar}
                </TableCell>
                <TableCell>
                  <div className="max-w-[160px] truncate">
                    {row.situacao || "-"}
                  </div>
                  {!row.isValid ? (
                    <div className="mt-1 text-xs text-danger-soft-foreground">
                      {row.invalidReasons[0]}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>
                  {row.classificacaoCalculada === "Inativo antigo" ? (
                    <Badge variant="muted">Inativo antigo</Badge>
                  ) : (
                    <StatusBadge status={row.nivel} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function ImportacoesView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [localRecords, setLocalRecords] =
    useState<ImportRecord[]>(getLocalImportRecords);
  const [supabaseState, setSupabaseState] = useState<SupabaseLoadState>({
    status: "loading",
    records: [],
    message: null,
  });
  const [activeImport, setActiveImport] = useState<ActiveImport | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [processingFileName, setProcessingFileName] = useState<string | null>(
    null,
  );
  const [processingFileSize, setProcessingFileSize] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishMode, setPublishMode] = useState<"supabase" | "local" | null>(
    null,
  );
  const [publishedCount, setPublishedCount] = useState(0);

  const records = useMemo(() => {
    if (supabaseState.status === "available") {
      return supabaseState.records;
    }

    const localIds = new Set(localRecords.map((record) => record.id));

    return [
      ...localRecords.map((record) => ({ ...record, origem: "local" as const })),
      ...mockImportRecords
        .filter((record) => !localIds.has(record.id))
        .map((record) => ({ ...record, origem: "mock" as const })),
    ].sort((first, second) => second.criadoEm.localeCompare(first.criadoEm));
  }, [localRecords, supabaseState.records, supabaseState.status]);

  async function refreshSupabaseRecords() {
    const response = await listSupabaseImportRecordsAction();

    setSupabaseState({
      status: response.status,
      records: response.records,
      message: response.message ?? null,
    });
  }

  useEffect(() => {
    let isMounted = true;

    listSupabaseImportRecordsAction()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setSupabaseState({
          status: response.status,
          records: response.records,
          message: response.message ?? null,
        });
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setSupabaseState({
          status: "error",
          records: [],
          message:
            error instanceof Error
              ? error.message
              : "Não foi possível consultar o Supabase.",
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function persistLocalRecords(updater: (records: ImportRecord[]) => ImportRecord[]) {
    setLocalRecords((currentRecords) => {
      const nextRecords = updater(currentRecords);

      saveLocalImportRecords(nextRecords);

      return nextRecords;
    });
  }

  function startImport() {
    setIsCreating(true);
    setCurrentStep("upload");
    setActiveImport(null);
    setErrorMessage(null);
    setPublishMessage(null);
    setPublishMode(null);
    setPublishedCount(0);
    setProcessingFileName(null);
    setProcessingFileSize(null);
    fileInputRef.current?.focus();
  }

  async function handleFile(file: File | null) {
    if (!file) {
      return;
    }

    const importId = buildImportId();
    const createdAt = new Date().toISOString();

    setActiveImport(null);
    setErrorMessage(null);
    setCurrentStep("upload");

    if (file.size > IMPORT_UPLOAD_LIMIT_BYTES) {
      const message = buildImportLimitMessage(file.size);
      const record: ImportRecord = {
        id: importId,
        arquivo: file.name,
        criadoEm: createdAt,
        status: "erro",
        totalLinhas: 0,
        linhasValidas: 0,
        linhasInvalidas: 0,
        duplicados: 0,
        colunasReconhecidas: 0,
        colunasNaoReconhecidas: 0,
        mensagem: message,
      };

      setErrorMessage(message);
      persistLocalRecords((currentRecords) => upsertRecord(currentRecords, record));

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setIsParsing(true);
    setProcessingFileName(file.name);
    setProcessingFileSize(formatImportFileSize(file.size));

    try {
      const result = await parseImportFile(file, importId);
      const record: ImportRecord = {
        id: importId,
        arquivo: file.name,
        criadoEm: createdAt,
        status: "validada",
        totalLinhas: result.totalRows,
        linhasValidas: result.validRows,
        linhasInvalidas: result.invalidRows,
        duplicados: result.possibleDuplicates,
        colunasReconhecidas: result.recognizedColumns.length,
        colunasNaoReconhecidas: result.unrecognizedColumns.length,
      };

      setActiveImport({ id: importId, record, result });
      persistLocalRecords((currentRecords) => upsertRecord(currentRecords, record));
      setCurrentStep("validacao");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível ler a planilha enviada.";
      const record: ImportRecord = {
        id: importId,
        arquivo: file.name,
        criadoEm: createdAt,
        status: "erro",
        totalLinhas: 0,
        linhasValidas: 0,
        linhasInvalidas: 0,
        duplicados: 0,
        colunasReconhecidas: 0,
        colunasNaoReconhecidas: 0,
        mensagem: message,
      };

      setActiveImport(null);
      setErrorMessage(message);
      persistLocalRecords((currentRecords) => upsertRecord(currentRecords, record));
    } finally {
      setIsParsing(false);
      setProcessingFileName(null);
      setProcessingFileSize(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function publishLocally(message: string) {
    if (!activeImport) {
      return;
    }

    const publishedAt = new Date().toISOString();
    const nextRecord: ImportRecord = {
      ...activeImport.record,
      status: "publicada",
      publicadoEm: publishedAt,
      origem: "local",
      mensagem: message,
    };

    savePublishedImportClients(activeImport.id, activeImport.result.clients);
    setPublishedCount(activeImport.result.clients.length);
    setPublishMode("local");
    setPublishMessage(message);
    setActiveImport((current) =>
      current ? { ...current, record: nextRecord } : current,
    );
    persistLocalRecords((currentRecords) =>
      upsertRecord(currentRecords, nextRecord),
    );
    setCurrentStep("publicacao");
  }

  async function publishImport() {
    if (!activeImport || isPublishing) {
      return;
    }

    setIsPublishing(true);
    setErrorMessage(null);
    setPublishMessage(null);

    try {
      const response = await publishSupabaseImportApi({
        requestedImportId: activeImport.id,
        record: activeImport.record,
        result: activeImport.result,
      });

      if (response.status === "published") {
        setPublishedCount(response.publishedClients);
        setPublishMode("supabase");
        setPublishMessage(
          `${response.message} ${response.portfolioItems} itens de carteira foram criados.`,
        );
        setActiveImport((current) =>
          current ? { ...current, record: response.record } : current,
        );
        setLocalRecords((currentRecords) => {
          const nextRecords = currentRecords.filter(
            (record) => record.id !== activeImport.id,
          );

          saveLocalImportRecords(nextRecords);

          return nextRecords;
        });
        setSupabaseState((current) => ({
          status: "available",
          records: upsertRecord(current.records, response.record),
          message: null,
        }));
        setCurrentStep("publicacao");
        void refreshSupabaseRecords();
        return;
      }

      setSupabaseState({
        status: response.status,
        records: [],
        message: response.message,
      });
      publishLocally(response.message);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível publicar no Supabase. Dados salvos no fallback local.";

      if (message.includes(IMPORT_UPLOAD_LIMIT_LABEL)) {
        setErrorMessage(message);
        setCurrentStep("preview");
        return;
      }

      setSupabaseState({
        status: "error",
        records: [],
        message,
      });
      publishLocally(message);
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Dados da carteira"
        title="Importações"
        description="Importe a planilha original XLS/XLSX do Mercos, valide colunas e revise uma amostra antes de publicar no Supabase."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadImportTemplate}
            >
              <Download className="h-4 w-4" />
              Baixar planilha modelo
            </Button>
            <Button size="sm" onClick={startImport}>
              <UploadCloud className="h-4 w-4" />
              Nova importação
            </Button>
          </>
        }
      />

      <SupabaseStatusNotice state={supabaseState} />

      {isCreating ? (
        <Card className="mb-4">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Nova importação XLS/XLSX</CardTitle>
                <CardDescription>
                  Envie a planilha original do Mercos ou o modelo padronizado,
                  detecte o cabeçalho automaticamente e publique após revisar.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreating(false)}
              >
                Fechar fluxo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImportStepper currentStep={currentStep} />
            <UploadGuidance />

            {errorMessage ? (
              <div className="rounded-md border border-danger-soft bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
                {errorMessage}
              </div>
            ) : null}

            {currentStep === "upload" ? (
              <div className="rounded-lg border border-dashed bg-background p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                      Enviar planilha da carteira
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      Use um arquivo .xls ou .xlsx. A planilha original do
                      Mercos pode ter filtros acima do cabeçalho; o sistema
                      procura automaticamente as colunas comerciais conhecidas.
                      Limite por arquivo:{" "}
                      {IMPORT_UPLOAD_LIMIT_LABEL}.
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-3 px-0"
                      onClick={downloadImportTemplate}
                    >
                      <Download className="h-4 w-4" />
                      Baixar modelo com exemplo
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      disabled={isParsing}
                      onChange={(event) =>
                        void handleFile(event.target.files?.[0] ?? null)
                      }
                      className="max-w-full rounded-md border border-input bg-card px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium file:text-foreground"
                    />
                    {isParsing ? (
                      <div className="flex items-center gap-2 rounded-md border bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          Processando planilha...
                          {processingFileName
                            ? ` ${processingFileName}${processingFileSize ? ` (${processingFileSize})` : ""}`
                            : ""}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {activeImport && currentStep === "validacao" ? (
              <>
                <ValidationPanel result={activeImport.result} />
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep("upload")}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Trocar arquivo
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setCurrentStep("preview")}
                    disabled={activeImport.result.validRows === 0}
                  >
                    Ver preview
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : null}

            {activeImport && currentStep === "preview" ? (
              <>
                <PreviewTable rows={activeImport.result.rows} />
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep("validacao")}
                  >
                    Voltar à validação
                  </Button>
                  <Button
                    type="button"
                    onClick={publishImport}
                    disabled={isPublishing}
                  >
                    {isPublishing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {isPublishing ? "Publicando no banco..." : "Publicar importação"}
                  </Button>
                </div>
              </>
            ) : null}

            {activeImport && currentStep === "publicacao" ? (
              <div className="rounded-lg border bg-background p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-success text-success-foreground">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      {publishMode === "supabase"
                        ? "Importação publicada no Supabase"
                        : "Importação publicada no fallback local"}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {publishMode === "supabase"
                        ? `${publishedCount} linhas válidas foram gravadas no banco. Clientes duplicados são consolidados na Carteira.`
                        : `${publishedCount} linhas válidas foram salvas no navegador para manter o fluxo operacional.`}
                    </p>
                    {publishMessage ? (
                      <div className="mt-3 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                        {publishMessage}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {publishMode === "local" ? (
                        <Button asChild size="sm">
                          <Link href="/carteira">Abrir carteira local</Link>
                        </Button>
                      ) : null}
                      <Button type="button" variant="outline" size="sm" onClick={startImport}>
                        Nova importação
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <ImportRecordsList records={records} />
    </>
  );
}

