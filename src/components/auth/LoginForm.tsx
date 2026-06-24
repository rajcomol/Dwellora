"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import RecoveryPasswordForm from "@/components/auth/RecoveryPasswordForm";
import { authStyles } from "@/components/auth/auth-styles";
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
    void supabase.auth
      .getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) {
          await supabase.auth.signOut().catch(() => undefined);
          setUser(null);
          return;
        }
        setUser(session?.user ?? null);
      })
      .catch(() => {
        setUser(null);
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
    if (busy) return;
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

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void handleSignIn();
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

  if (recoveryMode) {
    return <RecoveryPasswordForm redirectTo={safeNextPath(nextParam)} />;
  }

  return (
    <div>
      <h1 className="text-[1.5rem] font-medium text-[#1c1917]">{t("login.welcomeTitle")}</h1>
      <p className="mt-1 text-sm text-[#78716c]">{t("login.loginSubtitle")}</p>

      {inviteFlow && !user ? (
        <div className="mt-6 rounded-lg border border-[#e8dfd0] bg-[#fbf7ef] px-4 py-3 text-sm leading-relaxed text-[#57534e]">
          <p>{t("login.inviteBanner")}</p>
          <Link
            href={registerHref}
            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-[8px] bg-[#d97706] px-5 text-sm font-medium text-white transition-colors hover:bg-[#b45309]"
          >
            {t("login.inviteCreateAccountCta")}
          </Link>
        </div>
      ) : null}

      {user ? (
        <div className="mt-7 space-y-5">
          <p className="text-sm text-[#57534e]">
            {t("login.signedInAs")}{" "}
            <span className="font-medium text-[#1c1917]">{user.email}</span>
          </p>
          <div className="flex flex-col gap-3">
            {nextParam?.includes("/invite/accept") ? (
              <Link href={nextParam} className={authStyles.button}>
                {t("login.continueToInvite")}
              </Link>
            ) : (
              <Link href="/dashboard" className={authStyles.button}>
                {t("login.goToDashboard")}
              </Link>
            )}
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={busy}
              className="flex h-11 w-full items-center justify-center rounded-[8px] border-[0.5px] border-[#e8dfd0] bg-white text-sm font-medium text-[#57534e] transition-colors hover:bg-[#f5f0e8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t("login.signOutButton")}
            </button>
          </div>
        </div>
      ) : (
        <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="login-email" className={authStyles.label}>
              {t("login.email")}
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder={t("login.placeholderEmail")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authStyles.input}
            />
          </div>
          <div>
            <label htmlFor="login-password" className={authStyles.label}>
              {t("login.password")}
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authStyles.input}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[#57534e]">
              <input
                id="login-remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-[#d6cdbd] accent-[#d97706]"
              />
              <span>{t("login.rememberMe")}</span>
            </label>
            <Link href={forgotHref} className={authStyles.link}>
              {t("login.forgotPassword")}
            </Link>
          </div>

          <button type="submit" disabled={busy} className={authStyles.button}>
            {busy ? t("login.pleaseWait") : t("login.signInButton")}
          </button>

          <p className="text-center text-sm text-[#78716c]">
            <span>{t("login.signUpPrompt")} </span>
            <Link href={registerHref} className={authStyles.link}>
              {t("login.signUpLink")}
            </Link>
          </p>
        </form>
      )}

      {message ? (
        <div role="alert" className={authStyles.alert(message.type)}>
          {message.text}
        </div>
      ) : null}
    </div>
  );
}
