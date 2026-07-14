import type { SupabaseClient } from "@supabase/supabase-js";

export const PLANNER_RENDERS_BUCKET = "planner-renders";

/**
 * Geldigheidsduur van signed URLs voor planner-renders (seconden).
 * De bucket is privé; renders worden alleen via tijdelijke signed URLs getoond.
 * Verlopen URLs worden on demand opnieuw ondertekend via /api/planner/render-url.
 */
export const PLANNER_RENDER_SIGNED_URL_TTL_SECONDS = 3600;

/** Resultaat van het opslaan van een render: een signed URL + het pad om te resignen. */
export type PersistedRender = {
  url: string;
  /** Storage-pad (userId/folder/naam), null bij data-URL fallback. */
  path: string | null;
};

/** Maakt een verse signed URL voor een bestaand render-pad. */
export async function createSignedRenderUrl(
  client: SupabaseClient,
  path: string,
  expiresIn: number = PLANNER_RENDER_SIGNED_URL_TTL_SECONDS
): Promise<string> {
  const { data, error } = await client.storage
    .from(PLANNER_RENDERS_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Geen signed URL voor render.");
  return data.signedUrl;
}

async function uploadToBucket(
  client: SupabaseClient,
  userId: string,
  folder: string,
  name: string,
  bytes: Buffer,
  contentType: string
): Promise<PersistedRender> {
  const path = `${userId}/${folder}/${name}`;
  const { error } = await client.storage
    .from(PLANNER_RENDERS_BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  const url = await createSignedRenderUrl(client, path);
  return { url, path };
}

export function newRenderFolder(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function persistPlannerRender(
  client: SupabaseClient,
  userId: string,
  folder: string,
  fileName: string,
  bytes: Buffer
): Promise<PersistedRender> {
  try {
    return await uploadToBucket(client, userId, folder, fileName, bytes, "image/png");
  } catch (e) {
    console.warn("planner render upload faalde, val terug op data-URL:", (e as Error)?.message);
    return { url: `data:image/png;base64,${bytes.toString("base64")}`, path: null };
  }
}
