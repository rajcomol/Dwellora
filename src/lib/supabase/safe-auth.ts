import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

function isStaleSessionError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes("refresh token") || lower.includes("invalid jwt") || lower.includes("jwt expired");
}

async function clearStaleSession(supabase: SupabaseClient): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    /* ignore sign-out failures when auth service is unreachable */
  }
}

/** Resilient getUser for middleware/proxy — never throws on network or stale session errors. */
export async function safeGetUser(supabase: SupabaseClient): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      if (isStaleSessionError(error.message)) {
        await clearStaleSession(supabase);
      }
      return null;
    }
    return data.user;
  } catch {
    return null;
  }
}

/** Resilient getSession for Server Components — never throws on network or stale session errors. */
export async function safeGetSession(supabase: SupabaseClient): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      if (isStaleSessionError(error.message)) {
        await clearStaleSession(supabase);
      }
      return null;
    }
    return data.session;
  } catch {
    return null;
  }
}
