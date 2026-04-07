import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export type UserSupabase = {
  client: SupabaseClient;
  userId: string;
  email: string | null;
};

/** Parse `Cookie` header (Request has no `cookies` API in Route Handlers). */
function cookiesFromHeader(cookieHeader: string | null): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  const out: { name: string; value: string }[] = [];
  let start = 0;
  while (start < cookieHeader.length) {
    const semi = cookieHeader.indexOf(";", start);
    const end = semi === -1 ? cookieHeader.length : semi;
    const segment = cookieHeader.slice(start, end).trim();
    if (segment) {
      const eq = segment.indexOf("=");
      if (eq > 0) {
        const name = segment.slice(0, eq).trim();
        const value = segment.slice(eq + 1).trim();
        if (name) out.push({ name, value });
      }
    }
    start = semi === -1 ? cookieHeader.length : semi + 1;
  }
  return out;
}

async function userFromCookieAdapter(
  url: string,
  anonKey: string,
  getAll: () => { name: string; value: string }[],
  setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => void
): Promise<UserSupabase | null> {
  const serverClient = createServerClient(url, anonKey, {
    cookies: { getAll, setAll },
  });
  const {
    data: { user },
    error,
  } = await serverClient.auth.getUser();
  if (error || !user) return null;
  return { client: serverClient, userId: user.id, email: user.email ?? null };
}

/**
 * Supabase client scoped to the caller's JWT (PostgREST + Storage RLS).
 * 1) `Authorization: Bearer <access_token>` when valid.
 * 2) Session cookies via `next/headers` (SSR store).
 * 3) Raw `Cookie` header (fallback when store is empty on some hosts / mobile).
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
  const fromNextHeaders = await userFromCookieAdapter(url, anonKey, () => cookieStore.getAll(), (cookiesToSet) => {
    try {
      cookiesToSet.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    } catch {
      /* Route handlers may not always be able to set cookies. */
    }
  });
  if (fromNextHeaders) return fromNextHeaders;

  const rawHeader = req.headers.get("cookie");
  return userFromCookieAdapter(url, anonKey, () => cookiesFromHeader(rawHeader), () => {
    /* Cannot set cookies from raw header path; refresh may still read session. */
  });
}
