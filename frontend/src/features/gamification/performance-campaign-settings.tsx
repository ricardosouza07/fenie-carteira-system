"use client";

import {
  CalendarDays,
  Gift,
  Plus,
  RotateCcw,
  Save,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { useMemo, useState } from "react";

import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { AchievementProgressBar } from "./achievement-progress-bar";
import { useGamification } from "./gamification-provider";
import {
  buildMonthlyGamificationSummary,
  clonePerformanceCampaign,
  defaultPerformanceCampaign,
} from "./service";
import type {
  AchievementLevel,
  CampaignStatus,
  PerformanceCampaign,
} from "./types";

type CampaignEditableFields = Pick<
  PerformanceCampaign,
  "nome" | "mesAno" | "periodoInicial" | "periodoFinal" | "status"
>;

type MilestoneTextField = "nome" | "premio" | "descricao";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(date: string) {
  if (!date) {
    return "-";
  }

  const parsedDate = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return dateFormatter.format(parsedDate);
}

function formatMonth(month: string) {
  if (!month) {
    return "-";
  }

  const parsedDate = new Date(`${month}-01T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return monthFormatter.format(parsedDate);
}

function createMilestone(index: number): AchievementLevel {
  return {
    id: `marco-${Date.now()}`,
    nome: `Novo marco ${index}`,
    pontos: index * 100,
    premio: "Definir prêmio",
    descricao: "Reconhecimento comercial do mês.",
    ativo: true,
  };
}

function sortMilestones(milestones: AchievementLevel[]) {
  return [...milestones].sort((first, second) => first.pontos - second.pontos);
}

function FieldLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mb-1 block text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PerformanceCampaignSettings() {
  const { campaign, events, updateCampaign } = useGamification();
  const [draft, setDraft] = useState<PerformanceCampaign>(() =>
    clonePerformanceCampaign(campaign),
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const sortedMilestones = useMemo(
    () => sortMilestones(draft.marcos),
    [draft.marcos],
  );

  const draftSummary = useMemo(
    () => buildMonthlyGamificationSummary(events, draft.mesAno, draft),
    [draft, events],
  );

  const activeMilestones = draft.marcos.filter((milestone) => milestone.ativo);
  const nextPrize = draftSummary.nextPrizeLevel?.premio ?? "Todos conquistados";
  const campaignStatusLabel = draft.status === "ativa" ? "Ativa" : "Inativa";

  function updateCampaignField<K extends keyof CampaignEditableFields>(
    field: K,
    value: CampaignEditableFields[K],
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  }

  function updateMilestoneText(
    id: string,
    field: MilestoneTextField,
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      marcos: current.marcos.map((milestone) =>
        milestone.id === id ? { ...milestone, [field]: value } : milestone,
      ),
    }));
    setFeedback(null);
  }

  function updateMilestonePoints(id: string, value: string) {
    const points = Math.max(0, Number(value) || 0);

    setDraft((current) => ({
      ...current,
      marcos: current.marcos.map((milestone) =>
        milestone.id === id ? { ...milestone, pontos: points } : milestone,
      ),
    }));
    setFeedback(null);
  }

  function updateMilestoneStatus(id: string, value: string) {
    setDraft((current) => ({
      ...current,
      marcos: current.marcos.map((milestone) =>
        milestone.id === id ? { ...milestone, ativo: value === "ativo" } : milestone,
      ),
    }));
    setFeedback(null);
  }

  function addMilestone() {
    setDraft((current) => ({
      ...current,
      marcos: [...current.marcos, createMilestone(current.marcos.length + 1)],
    }));
    setFeedback(null);
  }

  function removeMilestone(id: string) {
    setDraft((current) => ({
      ...current,
      marcos: current.marcos.filter((milestone) => milestone.id !== id),
    }));
    setFeedback(null);
  }

  function restoreSuggestion() {
    setDraft(clonePerformanceCampaign(defaultPerformanceCampaign));
    setFeedback("Sugestão inicial carregada. Salve para aplicar no sistema.");
  }

  function saveCampaign() {
    const nextCampaign = {
      ...draft,
      atualizadoEm: new Date().toISOString(),
      marcos: sortMilestones(draft.marcos),
    };

    updateCampaign(nextCampaign);
    setDraft(clonePerformanceCampaign(nextCampaign));
    setFeedback("Campanha salva localmente para esta sessão.");
  }

  return (
    <>
      <PageHeader
        eyebrow="Gamificação"
        title="Metas"
        description="Configure os marcos de pontos e os prêmios mensais com foco em reconhecimento profissional da equipe."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={restoreSuggestion}>
              <RotateCcw className="h-4 w-4" />
              Restaurar sugestão
            </Button>
            <Button size="sm" onClick={saveCampaign}>
              <Save className="h-4 w-4" />
              Salvar campanha
            </Button>
          </>
        }
      />

      <section className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Campanha"
          value={campaignStatusLabel}
          hint={draft.nome}
          icon={Target}
          tone={draft.status === "ativa" ? "success" : "default"}
        />
        <MetricCard
          label="Mês da campanha"
          value={formatMonth(draft.mesAno)}
          hint={`${formatDate(draft.periodoInicial)} a ${formatDate(
            draft.periodoFinal,
          )}`}
          icon={CalendarDays}
          tone="info"
        />
        <MetricCard
          label="Próximo prêmio"
          value={nextPrize}
          hint={draftSummary.nextPrizeLevel?.nome ?? "Campanha completa"}
          icon={Gift}
          tone="warning"
        />
        <MetricCard
          label="Prêmios conquistados"
          value={String(draftSummary.achievedPrizeLevels.length)}
          hint={`${activeMilestones.length} marcos ativos`}
          icon={Trophy}
          tone="success"
        />
      </section>

      {feedback ? (
        <div
          role="status"
          className="mb-4 rounded-md border border-primary/20 bg-accent px-3 py-2 text-sm text-accent-foreground"
        >
          {feedback}
        </div>
      ) : null}

      <Card className="mb-4">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Campanha de Performance do Mês</CardTitle>
              <CardDescription>
                Defina o período, status e identidade da campanha que aparece no
                Dashboard e na barra de conquista.
              </CardDescription>
            </div>
            <Badge variant={draft.status === "ativa" ? "success" : "muted"}>
              {campaignStatusLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="min-w-0 xl:col-span-2">
            <FieldLabel>Nome da campanha</FieldLabel>
            <Input
              value={draft.nome}
              onChange={(event) =>
                updateCampaignField("nome", event.target.value)
              }
            />
          </label>

          <label className="min-w-0">
            <FieldLabel>Mês/ano</FieldLabel>
            <Input
              type="month"
              value={draft.mesAno}
              onChange={(event) =>
                updateCampaignField("mesAno", event.target.value)
              }
            />
          </label>

          <label className="min-w-0">
            <FieldLabel>Período inicial</FieldLabel>
            <Input
              type="date"
              value={draft.periodoInicial}
              onChange={(event) =>
                updateCampaignField("periodoInicial", event.target.value)
              }
            />
          </label>

          <label className="min-w-0">
            <FieldLabel>Período final</FieldLabel>
            <Input
              type="date"
              value={draft.periodoFinal}
              onChange={(event) =>
                updateCampaignField("periodoFinal", event.target.value)
              }
            />
          </label>

          <label className="min-w-0">
            <FieldLabel>Status</FieldLabel>
            <select
              value={draft.status}
              onChange={(event) =>
                updateCampaignField(
                  "status",
                  event.target.value as CampaignStatus,
                )
              }
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
            >
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
            </select>
          </label>
        </CardContent>
      </Card>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_430px] min-[1700px]:grid-cols-[minmax(0,1fr)_520px]">
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Marcos configuráveis</CardTitle>
                <CardDescription>
                  Edite pontos, prêmios e descrições mantendo apenas os marcos
                  relevantes ativos.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addMilestone}>
                <Plus className="h-4 w-4" />
                Adicionar marco
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="hidden grid-cols-[minmax(150px,1fr)_110px_minmax(180px,1fr)_minmax(240px,1.2fr)_110px_40px] gap-3 px-1 text-xs font-semibold uppercase text-muted-foreground min-[1800px]:grid">
              <span>Nome do marco</span>
              <span>Pontos</span>
              <span>Prêmio</span>
              <span>Descrição curta</span>
              <span>Status</span>
              <span />
            </div>

            {sortedMilestones.map((milestone) => (
              <div
                key={milestone.id}
                className="grid gap-3 rounded-md border bg-background p-3 md:grid-cols-[minmax(0,1fr)_140px] min-[1800px]:grid-cols-[minmax(150px,1fr)_110px_minmax(180px,1fr)_minmax(240px,1.2fr)_110px_40px] min-[1800px]:items-start"
              >
                <label className="min-w-0">
                  <FieldLabel className="min-[1800px]:hidden">
                    Nome do marco
                  </FieldLabel>
                  <Input
                    value={milestone.nome}
                    onChange={(event) =>
                      updateMilestoneText(
                        milestone.id,
                        "nome",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="min-w-0">
                  <FieldLabel className="min-[1800px]:hidden">
                    Pontos necessários
                  </FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    value={milestone.pontos}
                    onChange={(event) =>
                      updateMilestonePoints(milestone.id, event.target.value)
                    }
                  />
                </label>

                <label className="min-w-0">
                  <FieldLabel className="min-[1800px]:hidden">
                    Prêmio
                  </FieldLabel>
                  <Input
                    value={milestone.premio}
                    onChange={(event) =>
                      updateMilestoneText(
                        milestone.id,
                        "premio",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label className="min-w-0 md:col-span-2 min-[1800px]:col-span-1">
                  <FieldLabel className="min-[1800px]:hidden">
                    Descrição curta
                  </FieldLabel>
                  <Textarea
                    value={milestone.descricao}
                    onChange={(event) =>
                      updateMilestoneText(
                        milestone.id,
                        "descricao",
                        event.target.value,
                      )
                    }
                    className="h-20 min-h-20 resize-none py-2 text-sm leading-5"
                  />
                </label>

                <label className="min-w-0">
                  <FieldLabel className="min-[1800px]:hidden">
                    Status
                  </FieldLabel>
                  <select
                    value={milestone.ativo ? "ativo" : "inativo"}
                    onChange={(event) =>
                      updateMilestoneStatus(milestone.id, event.target.value)
                    }
                    className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo antigo</option>
                  </select>
                </label>

                <div className="flex justify-end md:col-span-2 min-[1800px]:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMilestone(milestone.id)}
                    disabled={draft.marcos.length <= 1}
                    aria-label={`Remover marco ${milestone.nome}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Prévia da conquista</CardTitle>
            <CardDescription>
              A barra usa os pontos mockados atuais e os prêmios configurados
              nesta campanha.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AchievementProgressBar summary={draftSummary} />

            <div className="rounded-md border bg-background p-3">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Leitura executiva
              </Label>
              <div className="mt-2 text-sm text-foreground">
                {draftSummary.totalPoints} pts acumulados em{" "}
                {formatMonth(draft.mesAno)}. Próximo reconhecimento:{" "}
                <span className="font-semibold">{nextPrize}</span>.
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
