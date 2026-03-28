"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useI18n } from "@/i18n/provider";
import { supabase } from "@/lib/supabase/client";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

const inputClass =
  "h-11 w-full rounded-lg border border-renovation-border bg-renovation-elevated px-3.5 text-sm text-zinc-900 shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-renovation-concrete focus:border-renovation-steel focus:ring-2 focus:ring-renovation-accent/25 dark:border-renovation-border dark:bg-zinc-900/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-renovation-accent dark:focus:ring-renovation-accent/20";

export default function LoginForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

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

  async function handleSignUp() {
    setMessage(null);
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    if (data.user && !data.session) {
      setMessage({
        type: "success",
        text: t("login.signUpCheckEmail"),
      });
      return;
    }
    setMessage({ type: "success", text: t("login.signUpSuccessSession") });
    window.location.assign(safeNextPath(searchParams.get("next")));
  }

  async function handleSignIn() {
    setMessage(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({ type: "success", text: t("login.signInSuccess") });
    window.location.assign(safeNextPath(searchParams.get("next")));
  }

  async function handleSignOut() {
    setMessage(null);
    setBusy(true);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    window.location.assign("/login");
  }

  return (
    <Card className="rounded-2xl border-renovation-border p-6 shadow-renovation-card dark:border-renovation-border sm:p-8">
      <div className="border-b border-renovation-border/80 pb-5 dark:border-renovation-border/80">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t("login.accountHeading")}</h2>
        <p className="mt-1 text-sm leading-relaxed text-renovation-concrete dark:text-zinc-400">{t("login.accountIntro")}</p>
      </div>

      {user ? (
        <div className="mt-6 space-y-5">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {t("login.signedInAs")}{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{user.email}</span>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button type="button" variant="secondary" onClick={() => void handleSignOut()} disabled={busy}>
              {t("login.signOutButton")}
            </Button>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-renovation-steel px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-renovation-accent dark:text-renovation-accent-foreground"
            >
              {t("login.goToDashboard")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("login.email")}
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder={t("login.placeholderEmail")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="login-password" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {t("login.password")}
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:gap-3">
            <Button type="button" className="h-11 flex-1" onClick={() => void handleSignIn()} disabled={busy}>
              {busy ? t("login.pleaseWait") : t("login.signInButton")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 flex-1"
              onClick={() => void handleSignUp()}
              disabled={busy}
            >
              {t("login.signUpButton")}
            </Button>
          </div>
        </div>
      )}

      {message ? (
        <div
          role="alert"
          className={[
            "mt-6 rounded-lg border px-3.5 py-3 text-sm leading-snug",
            message.type === "error"
              ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100",
          ].join(" ")}
        >
          {message.text}
        </div>
      ) : null}
    </Card>
  );
}
