import { supabase } from "@/lib/supabase/client";
import type { VisualisatieData } from "@/lib/planner/types";

export type KamerPlannerRow = {
  id: string;
  project_id: string;
  user_id: string;
  naam: string;
  kamer_data: VisualisatieData;
  ai_analyse: Record<string, unknown>;
  aangemaakt_op: string;
  bijgewerkt_op: string;
};

const TABLE = "kamer_planners";
const SELECT = "id,project_id,user_id,naam,kamer_data,ai_analyse,aangemaakt_op,bijgewerkt_op";

export async function loadPlanners(projectId: string): Promise<KamerPlannerRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT)
    .eq("project_id", projectId)
    .order("bijgewerkt_op", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as KamerPlannerRow[];
}

export type SavePlannerInput = {
  id: string | null;
  projectId: string;
  naam: string;
  kamerData: VisualisatieData;
  aiAnalyse?: Record<string, unknown>;
};

export async function savePlanner(input: SavePlannerInput): Promise<KamerPlannerRow> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) throw new Error("Niet ingelogd.");

  if (input.id) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({
        naam: input.naam,
        kamer_data: input.kamerData,
        ai_analyse: input.aiAnalyse ?? {},
      })
      .eq("id", input.id)
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return data as KamerPlannerRow;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      project_id: input.projectId,
      user_id: userId,
      naam: input.naam,
      kamer_data: input.kamerData,
      ai_analyse: input.aiAnalyse ?? {},
    })
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return data as KamerPlannerRow;
}
