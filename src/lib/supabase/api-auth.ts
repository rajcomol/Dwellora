import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type UserSupabase = {
  client: SupabaseClient;
  userId: string;
  email: string | null;
};

/**
 * Builds a Supabase client scoped to the caller's JWT (PostgREST + Storage RLS).
 * Expects `Authorization: Bearer <access_token>` from the browser session.
 */
export async function createUserSupabaseFromRequest(req: Request): Promise<UserSupabase | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return null;

  return { client, userId: user.id, email: user.email ?? null };
}
