import type { SupabaseClient } from "@supabase/supabase-js";

export const PLANNER_RENDERS_BUCKET = "planner-renders";

async function uploadToBucket(
  client: SupabaseClient,
  userId: string,
  folder: string,
  name: string,
  bytes: Buffer,
  contentType: string
): Promise<string> {
  const path = `${userId}/${folder}/${name}`;
  const { error } = await client.storage.from(PLANNER_RENDERS_BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  const { data } = client.storage.from(PLANNER_RENDERS_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Geen publieke URL voor upload.");
  return data.publicUrl;
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
): Promise<string> {
  try {
    return await uploadToBucket(client, userId, folder, fileName, bytes, "image/png");
  } catch (e) {
    console.warn("planner render upload faalde, val terug op data-URL:", (e as Error)?.message);
    return `data:image/png;base64,${bytes.toString("base64")}`;
  }
}
