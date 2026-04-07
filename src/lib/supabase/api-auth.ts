import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export type UserSupabase = {
  client: SupabaseClient;
  userId: string;
  email: string | null;
};

/**
 * Supabase client scoped to the caller's JWT (PostgREST + Storage RLS).
 * 1) `Authorization: Bearer <access_token>` when the client sends it.
 * 2) Otherwise session cookies (`@supabase/ssr`), so same-origin calls work when
 *    the browser has no token in JS yet (e.g. mobile Safari / in-app browser quirks).
 */
export async function createUserSupabaseFromRequest(req: Request): Promise<UserSupabase | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (token) {
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (!error && user) {
      return { client, userId: user.id, email: user.email ?? null };
    }
  }

  const cookieStore = await cookies();
  const serverClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* Route handlers may not always be able to set cookies; session still read. */
        }
      },
    },
  });

  const {
    data: { user },
    error,
  } = await serverClient.auth.getUser();
  if (error || !user) return null;

  return { client: serverClient, userId: user.id, email: user.email ?? null };
}
