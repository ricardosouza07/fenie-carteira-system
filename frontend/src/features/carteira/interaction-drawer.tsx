"use client";

import { CalendarDays, DollarSign, Save, X } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type {
  CarteiraClient,
  CarteiraInteraction,
  CarteiraInteractionInput,
  ClientType,
  ContactChannel,
  ContactStatus,
} from "./types";

type InteractionDrawerProps = {
  client: CarteiraClient;
  interactions: CarteiraInteraction[];
  onClose: () => void;
  onSave: (interaction: CarteiraInteractionInput) => void;
};

type FieldError = {
  status?: string;
  canal?: string;
  valorRecuperado?: string;
};

const statusOptions: { value: ContactStatus; label: string }[] = [
  { value: "contatado", label: "Contatado" },
  { value: "aguardando", label: "Aguardando retorno" },
  { value: "convertido", label: "Convertido" },
  { value: "visita", label: "Visita encaminhada" },
];

const clientTypeOptions: { value: ClientType; label: string }[] = [
  { value: "loja", label: "Loja" },
  { value: "externo", label: "Externo" },
  { value: "novo", label: "Novo" },
  { value: "espontaneo", label: "Espontâneo" },
];

const channelOptions: { value: ContactChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "telefone", label: "Telefone" },
  { value: "email", label: "E-mail" },
  { value: "presencial", label: "Presencial" },
];

const interactionDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function defaultStatus(status: CarteiraClient["status"]): ContactStatus {
  if (status === "nao_trabalhado") {
    return "contatado";
  }

  return status;
}

function parseMoney(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function formatInteractionDate(value: string) {
  return interactionDateFormatter.format(new Date(value));
}

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (value: T) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={value === option.value ? "subtle" : "outline"}
            size="sm"
            className={cn(
              "justify-start",
              value === option.value && "border-primary/30",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function InteractionDrawer({
  client,
  interactions,
  onClose,
  onSave,
}: InteractionDrawerProps) {
  const [status, setStatus] = useState<ContactStatus | "">(
    defaultStatus(client.status),
  );
  const [clientType, setClientType] = useState<ClientType>("loja");
  const [channel, setChannel] = useState<ContactChannel | "">("whatsapp");
  const [observation, setObservation] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [recoveredValue, setRecoveredValue] = useState("");
  const [errors, setErrors] = useState<FieldError>({});

  const recentInteractions = useMemo(
    () =>
      interactions
        .filter((interaction) => interaction.clienteId === client.id)
        .slice(0, 3),
    [client.id, interactions],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldError = {};
    const parsedRecoveredValue = parseMoney(recoveredValue);

    if (!status) {
      nextErrors.status = "Selecione um status.";
    }

    if (!channel) {
      nextErrors.canal = "Selecione um canal.";
    }

    if (status === "convertido" && (!parsedRecoveredValue || parsedRecoveredValue <= 0)) {
      nextErrors.valorRecuperado = "Informe o valor recuperado.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !status || !channel) {
      return;
    }

    onSave({
      clienteId: client.id,
      status,
      tipo: clientType,
      canal: channel,
      observacao: observation.trim() || null,
      valorRecuperado: status === "convertido" ? parsedRecoveredValue : null,
      proximoFollowUp: nextFollowUp || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/35"
        onClick={onClose}
        aria-label="Fechar painel de registro"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="interaction-drawer-title"
        className="relative flex h-full w-full flex-col bg-card shadow-xl sm:max-w-[460px]"
      >
        <div className="flex items-start justify-between gap-3 border-b px-4 py-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              Registrar contato
            </div>
            <h2
              id="interaction-drawer-title"
              className="mt-1 truncate text-lg font-semibold"
            >
              {client.cliente}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Registro rápido de ação comercial.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
            <section className="rounded-lg border bg-muted/35 p-3">
              <div className="mb-3 text-xs font-semibold uppercase text-muted-foreground">
                Cliente selecionado
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Classificação
                  </div>
                  <div className="mt-1">
                    <StatusBadge status={client.nivel} />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Dias sem comprar
                  </div>
                  <div className="mt-1 font-mono font-semibold">
                    {client.diasSemComprar}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Telefone</div>
                  <div className="mt-1 truncate">{client.telefone}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Cidade</div>
                  <div className="mt-1 truncate">
                    {client.cidade} / {client.bairro}
                  </div>
                </div>
              </div>
            </section>

            <OptionGroup
              label="Status"
              options={statusOptions}
              value={status}
              onChange={(value) => {
                setStatus(value);
                setErrors((current) => ({ ...current, status: undefined }));
              }}
              error={errors.status}
            />

            <OptionGroup
              label="Tipo de cliente"
              options={clientTypeOptions}
              value={clientType}
              onChange={setClientType}
            />

            <OptionGroup
              label="Canal"
              options={channelOptions}
              value={channel}
              onChange={(value) => {
                setChannel(value);
                setErrors((current) => ({ ...current, canal: undefined }));
              }}
              error={errors.canal}
            />

            <div className="space-y-2">
              <Label htmlFor="interaction-observation">Observação</Label>
              <Textarea
                id="interaction-observation"
                value={observation}
                onChange={(event) => setObservation(event.target.value)}
                placeholder="Resumo do contato, objeção ou combinado com o cliente"
                maxLength={360}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="interaction-follow-up">Próximo follow-up</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="interaction-follow-up"
                    type="date"
                    value={nextFollowUp}
                    onChange={(event) => setNextFollowUp(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {status === "convertido" ? (
                <div className="space-y-2">
                  <Label htmlFor="interaction-recovered-value">
                    Valor recuperado
                  </Label>
                  <div className="relative">
                    <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="interaction-recovered-value"
                      inputMode="decimal"
                      value={recoveredValue}
                      onChange={(event) => {
                        setRecoveredValue(event.target.value);
                        setErrors((current) => ({
                          ...current,
                          valorRecuperado: undefined,
                        }));
                      }}
                      placeholder="0,00"
                      className="pl-9"
                    />
                  </div>
                  {errors.valorRecuperado ? (
                    <p className="text-xs text-destructive">
                      {errors.valorRecuperado}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <section className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between gap-2">
                <Label>Histórico local</Label>
                <Badge variant="outline">{recentInteractions.length}</Badge>
              </div>
              {recentInteractions.length ? (
                <div className="space-y-2">
                  {recentInteractions.map((interaction) => (
                    <div
                      key={interaction.id}
                      className="rounded-md border bg-card p-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={interaction.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatInteractionDate(interaction.criadoEm)}
                        </span>
                      </div>
                      {interaction.observacao ? (
                        <p className="mt-2 line-clamp-2 text-muted-foreground">
                          {interaction.observacao}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
                  Nenhuma interação registrada nesta sessão.
                </div>
              )}
            </section>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-card px-4 py-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4" />
              Salvar contato
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
