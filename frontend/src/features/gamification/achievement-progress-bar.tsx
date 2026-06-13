import { CheckCircle2, Circle, Gift } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { MonthlyGamificationSummary } from "./types";

type AchievementProgressBarProps = {
  summary: MonthlyGamificationSummary;
  className?: string;
};

export function AchievementProgressBar({
  summary,
  className,
}: AchievementProgressBarProps) {
  const finalLevel = summary.activeLevels[summary.activeLevels.length - 1];
  const nextText = summary.nextPrizeLevel
    ? `Próximo prêmio: ${summary.nextPrizeLevel.premio} · ${summary.nextPrizeLevel.nome} (${summary.nextPrizeLevel.pontos} pts)`
    : "Todos os marcos mensais conquistados";

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Conquista mensal
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-foreground">
              {summary.totalPoints}
            </span>
            <span className="text-sm text-muted-foreground">pts acumulados</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {summary.progressPercent}% até {finalLevel?.pontos ?? 0} pts
        </div>
      </div>

      <div>
        <div className="mb-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <span className="min-w-0 leading-5">{nextText}</span>
          <span className="font-mono">{summary.progressPercent}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${summary.progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2">
        {summary.activeLevels.map((level) => {
          const achieved = summary.totalPoints >= level.pontos;
          const isNext = summary.nextPrizeLevel?.id === level.id;
          const Icon = achieved ? CheckCircle2 : Circle;

          return (
            <div
              key={level.id}
              className={cn(
                "min-h-[136px] rounded-md border bg-background p-3",
                achieved && "border-primary/25 bg-accent/40",
              )}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "h-4 w-4",
                    achieved ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
                <span className="truncate text-sm font-medium">
                  {level.nome}
                </span>
              </div>
              <div className="mt-2 flex min-h-10 items-start gap-2 text-xs text-muted-foreground">
                <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="min-w-0 break-words leading-4">
                  {level.premio}
                </span>
              </div>
              <div className="mt-2 grid gap-1">
                <span className="font-mono text-xs text-muted-foreground">
                  {level.pontos} pts
                </span>
                <Badge
                  className="max-w-full justify-center whitespace-normal text-center leading-4"
                  variant={achieved ? "success" : isNext ? "info" : "muted"}
                >
                  {achieved
                    ? "Prêmio conquistado"
                    : isNext
                      ? "Próximo prêmio"
                      : "Futuro"}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
