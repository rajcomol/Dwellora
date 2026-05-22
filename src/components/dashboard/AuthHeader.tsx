"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useI18n } from "@/i18n/provider";
import { supabase } from "@/lib/supabase/client";

function userInitial(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const name = meta?.full_name ?? meta?.name;
  if (typeof name === "string" && name.trim()) {
    return name.trim().charAt(0).toUpperCase();
  }
  const email = user.email?.trim() ?? "";
  return email ? email.charAt(0).toUpperCase() : "?";
}

export default function AuthHeader() {
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.assign("/login");
  }

  if (user) {
    const initial = userInitial(user);
    return (
      <div className="flex items-center gap-2">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-renovation-muted text-sm font-semibold text-foreground dark:border dark:border-renovation-border dark:bg-renovation-elevated"
          title={user.email ?? ""}
          aria-hidden
        >
          {initial}
        </span>
        <span
          className="hidden max-w-[200px] truncate text-xs text-renovation-concrete lg:inline"
          title={user.email ?? ""}
        >
          {user.email}
        </span>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="min-h-10 rounded-md border border-renovation-border bg-transparent px-3 py-2 text-xs font-medium text-foreground hover:bg-renovation-surface dark:border-renovation-border dark:text-foreground dark:hover:bg-renovation-muted"
        >
          {t("auth.signOut")}
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex min-h-10 items-center rounded-md bg-renovation-accent px-3 py-2 text-xs font-medium text-white hover:bg-renovation-steel"
    >
      {t("auth.signIn")}
    </Link>
  );
}
