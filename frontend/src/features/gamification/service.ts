import type { CarteiraClient } from "@/features/carteira/types";
import { getCurrentPeriod } from "@/lib/current-period";

import type {
  AchievementLevel,
  InteractionPointInput,
  MonthlyGamificationSummary,
  PerformanceCampaign,
  PointAction,
  PointEvent,
  PointEventOrigin,
  SellerScore,
} from "./types";

const currentPeriod = getCurrentPeriod();
const TODAY = currentPeriod.date;
const campaignPeriodEnd = new Date(
  Date.UTC(Number(currentPeriod.year), Number(currentPeriod.month), 0),
)
  .toISOString()
  .slice(0, 10);
const FINAL_LEVEL_POINTS = 1200;

export const pointRules: Record<PointAction, number> = {
  contatado: 5,
  aguardando_retorno: 3,
  visita_encaminhada: 8,
  convertido: 20,
  cliente_novo: 15,
  pedido_espontaneo: 10,
  reativacao_inativo_antigo: 30,
  follow_up_no_prazo: 10,
};

export const defaultPerformanceCampaign: PerformanceCampaign = {
  id: `campanha-${currentPeriod.monthKey}`,
  nome: "Campanha de Performance do Mês",
  mesAno: currentPeriod.monthKey,
  periodoInicial: `${currentPeriod.monthKey}-01`,
  periodoFinal: campaignPeriodEnd,
  status: "ativa",
  atualizadoEm: `${TODAY}T00:00:00.000Z`,
  marcos: [
    {
      id: "aquecimento",
      nome: "Aquecimento",
      pontos: 100,
      premio: "Café especial",
      descricao: "Primeiro ritmo comercial consolidado.",
      ativo: true,
    },
    {
      id: "ritmo_bom",
      nome: "Ritmo bom",
      pontos: 250,
      premio: "Vale almoço",
      descricao: "Cadência constante de atendimento.",
      ativo: true,
    },
    {
      id: "alta_performance",
      nome: "Alta performance",
      pontos: 500,
      premio: "Bônus R$100",
      descricao: "Volume forte de ações comerciais.",
      ativo: true,
    },
    {
      id: "referencia_mes",
      nome: "Referência do mês",
      pontos: 800,
      premio: "Saída 1h mais cedo",
      descricao: "Referência operacional da equipe.",
      ativo: true,
    },
    {
      id: "elite_fenie",
      nome: "Elite Fenié",
      pontos: 1200,
      premio: "Prêmio especial",
      descricao: "Performance comercial de excelência.",
      ativo: true,
    },
  ],
};

export const achievementLevels: AchievementLevel[] =
  defaultPerformanceCampaign.marcos;

export function clonePerformanceCampaign(campaign: PerformanceCampaign) {
  return {
    ...campaign,
    marcos: campaign.marcos.map((level) => ({ ...level })),
  };
}

export function getActiveAchievementLevels(
  campaign: PerformanceCampaign = defaultPerformanceCampaign,
) {
  return [...campaign.marcos]
    .filter((level) => level.ativo)
    .sort((first, second) => first.pontos - second.pontos);
}

export function getCampaignFinalPoints(
  campaign: PerformanceCampaign = defaultPerformanceCampaign,
) {
  const activeLevels = getActiveAchievementLevels(campaign);
  const finalLevel = activeLevels[activeLevels.length - 1];

  return Math.max(1, finalLevel?.pontos ?? FINAL_LEVEL_POINTS);
}

const actionDescriptions: Record<PointAction, string> = {
  contatado: "Contato registrado",
  aguardando_retorno: "Aguardando retorno",
  visita_encaminhada: "Visita encaminhada",
  convertido: "Cliente convertido",
  cliente_novo: "Cliente novo",
  pedido_espontaneo: "Pedido espontâneo",
  reativacao_inativo_antigo: "Reativação de inativo antigo",
  follow_up_no_prazo: "Follow-up concluído no prazo",
};

const statusActionMap: Partial<Record<CarteiraClient["status"], PointAction>> = {
  contatado: "contatado",
  aguardando: "aguardando_retorno",
  visita: "visita_encaminhada",
  convertido: "convertido",
};

export function getMonthKey(date: string) {
  return date.slice(0, 7);
}

export function getActionDescription(action: PointAction) {
  return actionDescriptions[action];
}

export function getCurrentAchievementLevel(
  points: number,
  campaign: PerformanceCampaign = defaultPerformanceCampaign,
) {
  return (
    getActiveAchievementLevels(campaign)
      .reverse()
      .find((level) => points >= level.pontos) ?? null
  );
}

export function getNextAchievementLevel(
  points: number,
  campaign: PerformanceCampaign = defaultPerformanceCampaign,
) {
  return (
    getActiveAchievementLevels(campaign).find(
      (level) => points < level.pontos,
    ) ?? null
  );
}

export function createPointEventId() {
  return `pts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isOldInactive(client: CarteiraClient) {
  return client.nivel === "inativo" && client.diasSemComprar >= 180;
}

function isFollowUpOnTime(client: CarteiraClient) {
  return Boolean(client.proximaCompra && client.proximaCompra >= TODAY);
}

function createPointEvent({
  id,
  client,
  action,
  date,
  origin,
  value,
}: {
  id: string;
  client: CarteiraClient;
  action: PointAction;
  date: string;
  origin: PointEventOrigin;
  value?: number | null;
}): PointEvent {
  return {
    id,
    vendedor: client.vendedor,
    userId: client.vendedor.toLowerCase(),
    customerId: client.id,
    acao: action,
    pontos: pointRules[action],
    data: date,
    descricao: actionDescriptions[action],
    origem: origin,
    valorRecuperado: action === "convertido" ? (value ?? undefined) : undefined,
  };
}

function getInteractionActions({
  client,
  interaction,
}: InteractionPointInput) {
  const actions: PointAction[] = [];
  const statusAction = statusActionMap[interaction.status];

  if (statusAction) {
    actions.push(statusAction);
  }

  if (interaction.tipo === "novo") {
    actions.push("cliente_novo");
  }

  if (interaction.tipo === "espontaneo") {
    actions.push("pedido_espontaneo");
  }

  if (interaction.status === "convertido" && isOldInactive(client)) {
    actions.push("reativacao_inativo_antigo");
  }

  if (interaction.status !== "aguardando" && isFollowUpOnTime(client)) {
    actions.push("follow_up_no_prazo");
  }

  return actions;
}

export function calculateInteractionPointEvents(input: InteractionPointInput) {
  const origin = input.origem ?? "interaction_drawer";
  const date = input.createdAt.slice(0, 10);

  return getInteractionActions(input).map((action, index) =>
    createPointEvent({
      id: `${createPointEventId()}-${index}`,
      client: input.client,
      action,
      date,
      origin,
      value: input.interaction.valorRecuperado,
    }),
  );
}

export function buildMockPointEvents(clients: CarteiraClient[]) {
  return clients.flatMap((client) => {
    if (!client.ultimaAcao.data || client.status === "nao_trabalhado") {
      return [];
    }

    const statusAction = statusActionMap[client.status];

    if (!statusAction) {
      return [];
    }

    const baseEvent = createPointEvent({
      id: `mock-${client.id}-${statusAction}`,
      client,
      action: statusAction,
      date: client.ultimaAcao.data,
      origin: "mock_seed",
      value: client.status === "convertido" ? client.valorUltimoPedido : null,
    });

    const extraEvents: PointEvent[] = [];

    if (client.status === "convertido" && client.diasSemComprar <= 30) {
      extraEvents.push(
        createPointEvent({
          id: `mock-${client.id}-cliente_novo`,
          client,
          action: "cliente_novo",
          date: client.ultimaAcao.data,
          origin: "mock_seed",
        }),
      );
    }

    if (client.status === "convertido" && isOldInactive(client)) {
      extraEvents.push(
        createPointEvent({
          id: `mock-${client.id}-reativacao`,
          client,
          action: "reativacao_inativo_antigo",
          date: client.ultimaAcao.data,
          origin: "mock_seed",
        }),
      );
    }

    if (isFollowUpOnTime(client)) {
      extraEvents.push(
        createPointEvent({
          id: `mock-${client.id}-follow_up`,
          client,
          action: "follow_up_no_prazo",
          date: client.ultimaAcao.data,
          origin: "mock_seed",
        }),
      );
    }

    return [baseEvent, ...extraEvents];
  });
}

function buildSellerScore(
  events: PointEvent[],
  campaign: PerformanceCampaign,
) {
  const sellers = new Map<string, SellerScore>();

  events.forEach((event) => {
    const current = sellers.get(event.userId) ?? {
      vendedor: event.vendedor,
      userId: event.userId,
      pontos: 0,
      contatos: 0,
      conversoes: 0,
      valorRecuperado: 0,
      nivelAtual: null,
    };

    current.pontos += event.pontos;

    if (
      event.acao === "contatado" ||
      event.acao === "aguardando_retorno" ||
      event.acao === "visita_encaminhada"
    ) {
      current.contatos += 1;
    }

    if (event.acao === "convertido") {
      current.conversoes += 1;
      current.valorRecuperado += event.valorRecuperado ?? 0;
    }

    sellers.set(event.userId, current);
  });

  return Array.from(sellers.values())
    .map((seller) => ({
      ...seller,
      nivelAtual: getCurrentAchievementLevel(seller.pontos, campaign),
    }))
    .sort((first, second) => {
      if (second.pontos !== first.pontos) {
        return second.pontos - first.pontos;
      }

      return second.valorRecuperado - first.valorRecuperado;
    });
}

export function buildMonthlyGamificationSummary(
  events: PointEvent[],
  month: string,
  campaign: PerformanceCampaign = defaultPerformanceCampaign,
): MonthlyGamificationSummary {
  const monthEvents = events
    .filter((event) => getMonthKey(event.data) === month)
    .sort((first, second) => second.data.localeCompare(first.data));
  const totalPoints = monthEvents.reduce(
    (total, event) => total + event.pontos,
    0,
  );
  const activeLevels = getActiveAchievementLevels(campaign);
  const finalPoints = getCampaignFinalPoints(campaign);
  const achievedLevels = activeLevels.filter(
    (level) => totalPoints >= level.pontos,
  );
  const futureLevels = activeLevels.filter(
    (level) => totalPoints < level.pontos,
  );
  const nextLevel = getNextAchievementLevel(totalPoints, campaign);

  return {
    mes: month,
    totalPoints,
    progressPercent: Math.min(
      100,
      Math.round((totalPoints / finalPoints) * 100),
    ),
    currentLevel: getCurrentAchievementLevel(totalPoints, campaign),
    nextLevel,
    nextPrizeLevel: nextLevel,
    activeLevels,
    achievedLevels,
    achievedPrizeLevels: achievedLevels,
    futureLevels,
    sellerScores: buildSellerScore(monthEvents, campaign),
    recentEvents: monthEvents.slice(0, 8),
    lastEvent: monthEvents[0] ?? null,
    campaign,
  };
}

export function summarizePointEvents(events: PointEvent[]) {
  const points = events.reduce((total, event) => total + event.pontos, 0);
  const primaryEvent =
    events.find((event) => event.acao === "reativacao_inativo_antigo") ??
    events.find((event) => event.acao === "convertido") ??
    events[0] ??
    null;

  return {
    points,
    label: primaryEvent?.descricao ?? "Pontuação registrada",
  };
}
