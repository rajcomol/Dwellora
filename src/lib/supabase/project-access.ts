import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Confirms a project row is visible under the current Supabase client (RLS + user JWT).
 */
export async function requireAccessibleProject(
  client: SupabaseClient,
  projectId: string
): Promise<{ ok: true } | { ok: false; status: 404 | 500; message: string }> {
  const { data, error } = await client.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (error) return { ok: false, status: 500, message: error.message };
  if (!data) return { ok: false, status: 404, message: "Project not found." };
  return { ok: true };
}
