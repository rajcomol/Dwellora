import { describe, expect, it, vi } from "vitest";
import { safeGetSession, safeGetUser } from "@/lib/supabase/safe-auth";

function mockSupabase(handlers: {
  getUser?: () => Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
  getSession?: () => Promise<{ data: { session: { user: { id: string } } | null }; error: { message: string } | null }>;
  signOut?: () => Promise<{ error: null }>;
}) {
  return {
    auth: {
      getUser: handlers.getUser ?? (async () => ({ data: { user: null }, error: null })),
      getSession: handlers.getSession ?? (async () => ({ data: { session: null }, error: null })),
      signOut: handlers.signOut ?? (async () => ({ error: null })),
    },
  } as never;
}

describe("safeGetUser", () => {
  it("returns user when auth succeeds", async () => {
    const user = { id: "u1" };
    const supabase = mockSupabase({
      getUser: async () => ({ data: { user }, error: null }),
    });
    await expect(safeGetUser(supabase)).resolves.toEqual(user);
  });

  it("returns null on network failure without throwing", async () => {
    const supabase = mockSupabase({
      getUser: async () => {
        throw new Error("fetch failed");
      },
    });
    await expect(safeGetUser(supabase)).resolves.toBeNull();
  });

  it("clears stale session on invalid refresh token", async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    const supabase = mockSupabase({
      getUser: async () => ({
        data: { user: null },
        error: { message: "Invalid Refresh Token: Refresh Token Not Found" },
      }),
      signOut,
    });
    await expect(safeGetUser(supabase)).resolves.toBeNull();
    expect(signOut).toHaveBeenCalledOnce();
  });
});

describe("safeGetSession", () => {
  it("returns session when auth succeeds", async () => {
    const session = { user: { id: "u1" } };
    const supabase = mockSupabase({
      getSession: async () => ({ data: { session }, error: null }),
    });
    await expect(safeGetSession(supabase)).resolves.toEqual(session);
  });

  it("returns null on fetch errors without throwing", async () => {
    const supabase = mockSupabase({
      getSession: async () => {
        throw new Error("AuthRetryableFetchError");
      },
    });
    await expect(safeGetSession(supabase)).resolves.toBeNull();
  });
});
