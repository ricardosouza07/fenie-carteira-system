import type { SupabaseClient } from "@supabase/supabase-js";

import {
  canAccessCustomer,
  getAuthenticatedSupabaseClient,
} from "@/features/auth/access";

import type {
  SaveInteractionSupabaseInput,
  SaveInteractionSupabaseResult,
} from "./server-types";

type SupabaseServiceClient = SupabaseClient;
type Row = Record<string, unknown>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function localFallback(message: string): SaveInteractionSupabaseResult {
  return {
    status: "local_fallback",
    message,
  };
}

async function expectNoError<T>(
  operation: PromiseLike<{ data: T; error: { message: string } | null }>,
  context: string,
): Promise<NonNullable<T>> {
  const { data, error } = await operation;

  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }

  return data as NonNullable<T>;
}

function isUuid(value: string | null | undefined) {
  return Boolean(value && UUID_PATTERN.test(value));
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function toFollowUpTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

function numberOrNull(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function resolveCurrentPortfolioItem(
  client: SupabaseServiceClient,
  customerId: string,
  portfolioItemId: string | undefined,
) {
  if (isUuid(portfolioItemId)) {
    const item = await expectNoError(
      client
        .from("portfolio_items")
        .select("id,salesperson_id")
        .eq("id", portfolioItemId)
        .limit(1)
        .maybeSingle(),
      "Nao foi possivel consultar o item da carteira",
    );

    return item as Row | null;
  }

  const item = await expectNoError(
    client
      .from("portfolio_items")
      .select("id,salesperson_id")
      .eq("customer_id", customerId)
      .eq("is_current", true)
      .order("imported_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "Nao foi possivel localizar a carteira atual do cliente",
  );

  return item as Row | null;
}

async function resolveActiveCampaign(
  client: SupabaseServiceClient,
  occurredAt: string,
) {
  const date = occurredAt.slice(0, 10);
  const campaigns = await expectNoError(
    client
      .from("performance_campaigns")
      .select("id")
      .eq("status", "ativa")
      .lte("starts_at", date)
      .gte("ends_at", date)
      .order("created_at", { ascending: false })
      .limit(1),
    "Nao foi possivel consultar a campanha ativa",
  );

  const firstCampaign = Array.isArray(campaigns) ? campaigns[0] : null;

  return stringOrNull(firstCampaign?.id);
}

export async function saveInteractionToSupabase(
  input: SaveInteractionSupabaseInput,
): Promise<SaveInteractionSupabaseResult> {
  const access = await getAuthenticatedSupabaseClient();
  const client = access.client as SupabaseServiceClient | null;
  const profile = access.profile;

  if (!client) {
    return localFallback(
      access.message ??
        "Supabase nao esta configurado. A interacao foi mantida em modo local/mock.",
    );
  }

  if (!isUuid(input.client.id)) {
    return localFallback(
      "Este cliente ainda nao possui ID real do Supabase. A interacao foi mantida em modo local/mock.",
    );
  }

  if (!profile || !(await canAccessCustomer(input.client.id))) {
    return {
      status: "error",
      message: "Seu perfil nao tem permissao para registrar contato neste cliente.",
    };
  }

  try {
    const portfolioItem = await resolveCurrentPortfolioItem(
      client,
      input.client.id,
      input.client.portfolioItemId,
    );
    const portfolioItemId = stringOrNull(portfolioItem?.id);
    const isInternalUser =
      profile.role === "admin" ||
      profile.role === "supervisor" ||
      profile.role === "operador_interno";
    const salespersonId =
      isInternalUser
        ? stringOrNull(input.client.vendedorId) ??
          stringOrNull(portfolioItem?.salesperson_id) ??
          profile.salespersonId
        : profile.salespersonId ??
          stringOrNull(input.client.vendedorId) ??
          stringOrNull(portfolioItem?.salesperson_id);
    const profileId = profile.id;
    const userId = profile.id;
    const nextFollowUpAt = toFollowUpTimestamp(input.interaction.proximoFollowUp);
    const notes = input.interaction.observacao;

    const savedInteraction = (await expectNoError(
      client
        .from("customer_interactions")
        .insert({
          customer_id: input.client.id,
          portfolio_item_id: portfolioItemId,
          user_id: userId,
          profile_id: profileId,
          salesperson_id: salespersonId,
          status: input.interaction.status,
          work_status: input.interaction.status,
          customer_type: input.interaction.tipo,
          channel: input.interaction.canal,
          note: notes,
          notes,
          recovered_value: numberOrNull(input.interaction.valorRecuperado),
          next_follow_up_at: nextFollowUpAt,
          interaction_at: input.interaction.criadoEm,
          created_at: input.interaction.criadoEm,
        })
        .select("id")
        .single(),
      "Nao foi possivel salvar a interacao",
    )) as Row;
    const interactionId = String(savedInteraction.id);
    let followUpId: string | null = null;

    if (nextFollowUpAt) {
      const savedFollowUp = (await expectNoError(
        client
          .from("follow_ups")
          .insert({
            customer_id: input.client.id,
            interaction_id: interactionId,
            profile_id: profileId,
            salesperson_id: salespersonId,
            assigned_to: salespersonId,
            created_by: profileId,
            due_at: nextFollowUpAt,
            status: "aberto",
            source: "interacao",
            reason: notes ?? input.lastActionLabel,
            notes,
          })
          .select("id")
          .single(),
        "Nao foi possivel criar o follow-up",
      )) as Row;

      followUpId = String(savedFollowUp.id);
    }

    const campaignId = await resolveActiveCampaign(
      client,
      input.interaction.criadoEm,
    );
    const pointEventIds: string[] = [];

    if (input.pointEvents.length > 0) {
      const payload = input.pointEvents.map((event) => ({
        campaign_id: campaignId,
        customer_id: input.client.id,
        interaction_id: interactionId,
        follow_up_id: null,
        profile_id: profileId,
        salesperson_id: salespersonId,
        action: event.acao,
        points: event.pontos,
        description: event.descricao,
        origin: "interaction",
        occurred_at: input.interaction.criadoEm,
      }));
      const savedPointEvents = await expectNoError(
        client.from("point_events").insert(payload).select("id"),
        "Nao foi possivel salvar os eventos de pontos",
      );

      for (const event of Array.isArray(savedPointEvents)
        ? (savedPointEvents as Row[])
        : []) {
        const eventId = stringOrNull(event.id);

        if (eventId) {
          pointEventIds.push(eventId);
        }
      }
    }

    await expectNoError(
      client
        .from("customers")
        .update({
          work_status: input.interaction.status,
          last_action_label: input.lastActionLabel,
          last_action_at: input.interaction.criadoEm,
        })
        .eq("id", input.client.id),
      "Nao foi possivel atualizar o status do cliente",
    );

    if (portfolioItemId) {
      await expectNoError(
        client
          .from("portfolio_items")
          .update({ work_status: input.interaction.status })
          .eq("id", portfolioItemId),
        "Nao foi possivel atualizar o status do item da carteira",
      );
    }

    return {
      status: "saved",
      message: followUpId
        ? "Interacao e follow-up salvos no Supabase."
        : "Interacao salva no Supabase.",
      interactionId,
      followUpId,
      pointEventIds,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar a interacao no Supabase.",
    };
  }
}
