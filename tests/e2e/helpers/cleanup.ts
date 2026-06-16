import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Prefix voor Playwright-testprojecten; moet overeenkomen met uniqueName("PW …"). */
export const PW_E2E_PROJECT_PREFIX = "PW ";

const scheduledProjectNames = new Set<string>();

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

export function createSupabaseAdminClient(): SupabaseClient | null {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function schedulePwProjectCleanup(projectName: string): void {
  if (projectName.startsWith(PW_E2E_PROJECT_PREFIX)) {
    scheduledProjectNames.add(projectName);
  }
}

export async function deletePwProjectsByNames(projectNames: string[]): Promise<number> {
  const admin = createSupabaseAdminClient();
  if (!admin || projectNames.length === 0) {
    return 0;
  }

  const { data: projects, error: listError } = await admin
    .from("projects")
    .select("id, name")
    .in("name", projectNames);

  if (listError) {
    console.warn("[e2e cleanup] list projects failed:", listError.message);
    return 0;
  }

  return deleteProjectIdsInChunks(admin, (projects ?? []).map((p) => p.id));
}

export async function deletePwProjectsByPrefix(prefix = PW_E2E_PROJECT_PREFIX): Promise<number> {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return 0;
  }

  const { data: projects, error: listError } = await admin
    .from("projects")
    .select("id")
    .like("name", `${prefix}%`);

  if (listError) {
    console.warn("[e2e cleanup] list by prefix failed:", listError.message);
    return 0;
  }

  return deleteProjectIdsInChunks(admin, (projects ?? []).map((p) => p.id));
}

async function deleteProjectIdsInChunks(admin: SupabaseClient, ids: string[]): Promise<number> {
  if (ids.length === 0) {
    return 0;
  }

  const chunkSize = 40;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error: deleteError } = await admin.from("projects").delete().in("id", chunk);
    if (deleteError) {
      console.warn("[e2e cleanup] delete chunk failed:", deleteError.message);
      return deleted;
    }
    deleted += chunk.length;
  }
  return deleted;
}

/** Verwijdert tijdens de run geregistreerde PW-projecten plus een prefix-sweep. */
export async function flushPwProjectCleanup(): Promise<number> {
  const names = [...scheduledProjectNames];
  scheduledProjectNames.clear();
  const byNames = await deletePwProjectsByNames(names);
  const byPrefix = await deletePwProjectsByPrefix(PW_E2E_PROJECT_PREFIX);
  return byNames + byPrefix;
}
