"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import RecoveryPasswordForm from "@/components/auth/RecoveryPasswordForm";
import { LockIcon, MailIcon } from "@/components/auth/login-icons";
import { useI18n } from "@/i18n/provider";
import { parseTokenFromInviteNext } from "@/lib/invite/next-path";
import { loginCredentialsZodMessage } from "@/lib/validation/loginZodMessage";
import { loginCredentialsSchema } from "@/lib/validation/schemas";
import { supabase } from "@/lib/supabase/client";

const REMEMBER_EMAIL_KEY = "renotasker_login_email";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export default function LoginForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const inviteFlow = searchParams.get("invite") === "1";
  const forgotHref =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? `/login/forgot?next=${encodeURIComponent(nextParam)}`
      : "/login/forgot";
  const registerHref =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? `/login/register?next=${encodeURIComponent(nextParam)}${inviteFlow ? "&invite=1" : ""}`
      : inviteFlow
        ? "/login/register?invite=1"
        : "/login/register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (inviteFlow) {
      const token = parseTokenFromInviteNext(nextParam);
      if (token) {
        void fetch(`/api/invites/preview?token=${encodeURIComponent(token)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((body: { email?: string } | null) => {
            if (body?.email) setEmail(body.email);
          });
        return;
      }
    }
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved) {
        queueMicrotask(() => setEmail(saved));
      }
    } catch {
      /* ignore */
    }
  }, [inviteFlow, nextParam]);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function persistRememberEmail(value: string) {
    try {
      if (rememberMe && value.trim()) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, value.trim());
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch {
      /* ignore */
    }
  }

  async function handleSignIn() {
    setMessage(null);
    const creds = loginCredentialsSchema.safeParse({ email, password });
    if (!creds.success) {
      setMessage({ type: "error", text: loginCredentialsZodMessage(t, creds.error) });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: creds.data.email,
      password: creds.data.password,
    });
    setBusy(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    persistRememberEmail(creds.data.email);
    setMessage({ type: "success", text: t("login.signInSuccess") });
    window.location.assign(safeNextPath(nextParam));
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

  const authCardShell = "login-auth-glass rounded-[2rem] p-8 sm:p-10";
  const underlineWrap =
    "flex items-end gap-3 border-b border-amber-200/20 pb-2 transition-colors focus-within:border-amber-300/50";
  const inputClass =
    "min-h-[2.75rem] flex-1 border-0 bg-transparent text-sm text-zinc-50 outline-none ring-0 placeholder:text-zinc-500 focus:ring-0";

  if (recoveryMode) {
    return <RecoveryPasswordForm redirectTo={safeNextPath(nextParam)} />;
  }

  return (
    <div className={authCardShell}>
      <h2 className="mb-8 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/90">{t("login.cardHeading")}</h2>

      {inviteFlow && !user ? (
        <div className="mb-6 rounded-xl border border-cyan-400/25 bg-cyan-950/35 px-4 py-3 text-sm leading-relaxed text-cyan-50/95">
          <p>{t("login.inviteBanner")}</p>
          <Link
            href={registerHref}
            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-500/20 text-sm font-semibold text-cyan-50 transition-colors hover:bg-cyan-500/30 sm:w-auto sm:min-w-[12rem] sm:px-6"
          >
            {t("login.inviteCreateAccountCta")}
          </Link>
        </div>
      ) : null}

      {user ? (
        <div className="space-y-6">
          <p className="text-sm text-zinc-300">
            {t("login.signedInAs")}{" "}
            <span className="font-medium text-white">{user.email}</span>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-transparent px-5 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("login.signOutButton")}
            </button>
            {nextParam?.includes("/invite/accept") ? (
              <Link
                href={nextParam}
                className="inline-flex h-11 items-center justify-center rounded-full bg-amber-400 px-5 text-sm font-semibold text-stone-950 transition-opacity hover:bg-amber-300"
              >
                {t("login.continueToInvite")}
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-full bg-amber-400 px-5 text-sm font-semibold text-stone-950 transition-opacity hover:bg-amber-300"
              >
                {t("login.goToDashboard")}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label htmlFor="login-email" className="mb-2 block text-xs font-medium text-zinc-400">
              {t("login.email")}
            </label>
            <div className={underlineWrap}>
              <MailIcon className="mb-1 h-5 w-5 shrink-0 text-zinc-500" />
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
          </div>
          <div>
            <label htmlFor="login-password" className="mb-2 block text-xs font-medium text-zinc-400">
              {t("login.password")}
            </label>
            <div className={underlineWrap}>
              <LockIcon className="mb-1 h-5 w-5 shrink-0 text-zinc-500" />
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
              <input
                id="login-remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-white/30 bg-zinc-900/80 text-zinc-300 focus:ring-2 focus:ring-white/30"
              />
              <span>{t("login.rememberMe")}</span>
            </label>
            <Link
              href={forgotHref}
              className="text-sm italic text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-200 hover:underline"
            >
              {t("login.forgotPassword")}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => void handleSignIn()}
            disabled={busy}
            className="flex h-12 w-full items-center justify-center rounded-full bg-amber-400 text-sm font-semibold uppercase tracking-wide text-stone-950 transition-opacity hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? t("login.pleaseWait") : t("login.signInButton")}
          </button>

          <p className="text-center text-sm text-zinc-500">
            <span className="text-zinc-500">{t("login.signUpPrompt")} </span>
            <Link
              href={registerHref}
              className="font-medium text-zinc-300 underline-offset-2 transition-colors hover:text-white hover:underline"
            >
              {t("login.signUpLink")}
            </Link>
          </p>
        </div>
      )}

      {message ? (
        <div
          role="alert"
          className={[
            "mt-8 rounded-xl border px-3.5 py-3 text-sm leading-snug",
            message.type === "error"
              ? "border-[rgba(248,113,113,0.45)] bg-[rgba(69,10,10,0.55)] text-red-50 backdrop-blur-[10px]"
              : "border-[rgba(52,211,153,0.4)] bg-[rgba(6,78,59,0.5)] text-emerald-50 backdrop-blur-[10px]",
          ].join(" ")}
        >
          {message.text}
        </div>
      ) : null}
    </div>
  );
}
