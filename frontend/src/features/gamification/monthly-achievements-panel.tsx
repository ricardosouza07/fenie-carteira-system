import {
  Activity,
  CalendarDays,
  Clock3,
  Gift,
  Medal,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { AchievementProgressBar } from "./achievement-progress-bar";
import { getActionDescription } from "./service";
import type { MonthlyGamificationSummary } from "./types";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

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

export function MonthlyAchievementsPanel({
  summary,
}: {
  summary: MonthlyGamificationSummary;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-2">
            <Medal className="h-4 w-4 text-primary" />
            <CardTitle>Conquistas do mês</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge
              variant={summary.campaign.status === "ativa" ? "success" : "muted"}
            >
              Campanha {summary.campaign.status}
            </Badge>
            <span>{summary.campaign.nome}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
        <AchievementProgressBar summary={summary} />

        <div className="space-y-3">
          <div className="rounded-lg border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-primary" />
              Campanha ativa do mês
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {formatDate(summary.campaign.periodoInicial)} a{" "}
                {formatDate(summary.campaign.periodoFinal)}
              </Badge>
              <Badge
                variant={
                  summary.campaign.status === "ativa" ? "success" : "muted"
                }
              >
                {summary.campaign.status === "ativa" ? "Ativa" : "Inativa"}
              </Badge>
            </div>
          </div>

          <div className="rounded-lg border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Gift className="h-4 w-4 text-primary" />
              Próximo prêmio
            </div>
            <div className="mt-3">
              {summary.nextPrizeLevel ? (
                <>
                  <div className="text-sm font-medium">
                    {summary.nextPrizeLevel.premio}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {summary.nextPrizeLevel.nome} · faltam{" "}
                    {Math.max(
                      0,
                      summary.nextPrizeLevel.pontos - summary.totalPoints,
                    )}{" "}
                    pts
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Todos os prêmios da campanha foram conquistados.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-background p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-primary" />
              Prêmios já conquistados
            </div>
            {summary.achievedPrizeLevels.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {summary.achievedPrizeLevels.map((level) => (
                  <Badge key={level.id} variant="success">
                    {level.premio}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Nenhum prêmio conquistado neste mês.
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-background p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" />
              Último ponto recebido
            </div>
            {summary.lastEvent ? (
              <div className="mt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">
                    +{summary.lastEvent.pontos} pts
                  </span>
                  <Badge variant="outline">
                    {formatDate(summary.lastEvent.data)}
                  </Badge>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {summary.lastEvent.descricao} · {summary.lastEvent.vendedor}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-muted-foreground">
                Nenhuma pontuação registrada no mês.
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-background p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-primary" />
              Histórico recente de pontos
            </div>
            <div className="space-y-2">
              {summary.recentEvents.slice(0, 4).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {getActionDescription(event.acao)}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {event.vendedor} · {formatDate(event.data)}
                    </div>
                  </div>
                  <div className="font-mono text-sm font-semibold text-primary">
                    +{event.pontos}
                  </div>
                </div>
              ))}
              {summary.recentEvents.length === 0 ? (
                <div className="rounded-md border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
                  O histórico aparecerá após os primeiros registros.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Ranking discreto</h3>
          </div>
          <div className="space-y-2 md:hidden">
            {summary.sellerScores.map((seller) => (
              <div
                key={seller.userId}
                className="rounded-md border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{seller.vendedor}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {seller.contatos} contatos · {seller.conversoes} conversões
                    </div>
                  </div>
                  <Badge variant="outline">
                    {seller.nivelAtual?.nome ?? "Em evolução"}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span className="font-mono font-semibold text-primary">
                    {seller.pontos} pts
                  </span>
                  <span className="text-muted-foreground">
                    {formatCurrency(seller.valorRecuperado)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <Table className="min-w-[820px] table-density-compact">
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                  <TableHead className="text-right">Contatos</TableHead>
                  <TableHead className="text-right">Conversões</TableHead>
                  <TableHead className="text-right">Valor recuperado</TableHead>
                  <TableHead>Nível atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.sellerScores.map((seller) => (
                  <TableRow key={seller.userId}>
                    <TableCell className="font-medium">
                      {seller.vendedor}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-primary">
                      {seller.pontos}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {seller.contatos}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {seller.conversoes}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(seller.valorRecuperado)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {seller.nivelAtual?.nome ?? "Em evolução"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
