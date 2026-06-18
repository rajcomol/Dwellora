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
