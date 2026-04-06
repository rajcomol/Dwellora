"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { useI18n } from "@/i18n/provider";
import { supabase } from "@/lib/supabase/client";

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
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5 text-sm sm:gap-2">
        <span
          className="hidden max-w-[200px] truncate text-xs text-zinc-600 lg:inline dark:text-zinc-400"
          title={user.email ?? ""}
        >
          {user.email}
        </span>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="min-h-10 rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          {t("auth.signOut")}
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="inline-flex min-h-10 items-center rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
    >
      {t("auth.signIn")}
    </Link>
  );
}
