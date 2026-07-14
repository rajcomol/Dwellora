import type { SupabaseClient } from "@supabase/supabase-js";

export type PlannerGenerationKind = "visualiseer" | "verfijn";

export type PlannerQuota = {
  used: number;
  limit: number;
  remaining: number;
};

export function getPlannerDailyLimitEnv(): number {
  const raw = process.env.PLANNER_DAILY_LIMIT?.trim();
  if (!raw) return 5;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 5;
  return n;
}

export async function fetchPlannerDailyUsage(client: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await client.rpc("get_planner_daily_usage", {
    p_user_id: userId,
  });
  if (error) {
    console.error("get_planner_daily_usage", error.message);
    throw error;
  }
  const n = typeof data === "number" ? data : Number(data);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function getPlannerQuota(client: SupabaseClient, userId: string): Promise<PlannerQuota> {
  const limit = getPlannerDailyLimitEnv();
  const used = await fetchPlannerDailyUsage(client, userId);
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
  };
}

export function plannerDailyLimitResponse(used: number, limit: number): Response {
  return Response.json({ error: "daily_limit_reached", used, limit }, { status: 429 });
}

export async function checkPlannerDailyLimitOrRespond(
  client: SupabaseClient,
  userId: string
): Promise<Response | null> {
  const limit = getPlannerDailyLimitEnv();
  const used = await fetchPlannerDailyUsage(client, userId);
  if (used >= limit) {
    return plannerDailyLimitResponse(used, limit);
  }
  return null;
}

export async function recordPlannerGeneration(
  client: SupabaseClient,
  userId: string,
  kind: PlannerGenerationKind
): Promise<void> {
  const { error } = await client.from("planner_generations").insert({
    user_id: userId,
    kind,
  });
  if (error) {
    console.error("planner_generations insert", error.message);
  }
}

export type PlannerReservation = {
  ok: boolean;
  used: number;
  limit: number;
};

/**
 * Atomair: controleert de daglimiet én registreert de generatie in één DB-call.
 * Voorkomt de race waarbij twee gelijktijdige requests allebei de losse check passeren.
 */
export async function reservePlannerGeneration(
  client: SupabaseClient,
  userId: string,
  kind: PlannerGenerationKind
): Promise<PlannerReservation> {
  const limit = getPlannerDailyLimitEnv();
  const { data, error } = await client.rpc("reserve_planner_generation", {
    p_user_id: userId,
    p_kind: kind,
    p_limit: limit,
  });
  if (error) {
    console.error("reserve_planner_generation", error.message);
    throw error;
  }

  const row = (data ?? {}) as Partial<PlannerReservation>;
  const used = typeof row.used === "number" ? row.used : Number(row.used ?? 0);
  const resolvedLimit = typeof row.limit === "number" ? row.limit : Number(row.limit ?? limit);
  return {
    ok: row.ok === true,
    used: Number.isFinite(used) && used >= 0 ? used : 0,
    limit: Number.isFinite(resolvedLimit) && resolvedLimit >= 0 ? resolvedLimit : limit,
  };
}
