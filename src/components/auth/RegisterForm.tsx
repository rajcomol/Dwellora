"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LockIcon, MailIcon } from "@/components/auth/login-icons";
import { useI18n } from "@/i18n/provider";
import { parseTokenFromInviteNext } from "@/lib/invite/next-path";
import { signUpFormZodMessage } from "@/lib/validation/loginZodMessage";
import { signUpFormSchema } from "@/lib/validation/schemas";
import { supabase } from "@/lib/supabase/client";
import { getPublicSiteUrlClient } from "@/lib/site-url";

const REMEMBER_EMAIL_KEY = "renotasker_login_email";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export default function RegisterForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const inviteFlow = searchParams.get("invite") === "1";
  const loginHref =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? `/login?next=${encodeURIComponent(nextParam)}${inviteFlow ? "&invite=1" : ""}`
      : inviteFlow
        ? "/login?invite=1"
        : "/login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
      if (saved) queueMicrotask(() => setEmail(saved));
    } catch {
      /* ignore */
    }
  }, [inviteFlow, nextParam]);

  function persistEmailAfterSignUp(value: string) {
    try {
      if (value.trim()) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, value.trim());
      }
    } catch {
      /* ignore */
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const parsed = signUpFormSchema.safeParse({ email, password, confirmPassword });
    if (!parsed.success) {
      setMessage({ type: "error", text: signUpFormZodMessage(t, parsed.error) });
      return;
    }
    setBusy(true);
    const base = getPublicSiteUrlClient() || (typeof window !== "undefined" ? window.location.origin : "");
    const emailRedirectTo = `${base.replace(/\/$/, "")}/auth/confirm?next=${encodeURIComponent(safeNextPath(nextParam))}`;
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo,
      },
    });
    setBusy(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    persistEmailAfterSignUp(parsed.data.email);
    if (data.user && !data.session) {
      setMessage({
        type: "success",
        text: inviteFlow ? t("login.signUpCheckEmailInvite") : t("login.signUpCheckEmail"),
      });
      return;
    }
    setMessage({ type: "success", text: t("login.signUpSuccessSession") });
    window.location.assign(safeNextPath(nextParam));
  }

  const authCardShell = "login-auth-glass rounded-[2rem] p-8 sm:p-10";
  const underlineWrap =
    "flex items-end gap-3 border-b border-amber-200/20 pb-2 transition-colors focus-within:border-amber-300/50";
  const inputClass =
    "min-h-[2.75rem] flex-1 border-0 bg-transparent text-sm text-zinc-50 outline-none ring-0 placeholder:text-zinc-500 focus:ring-0";

  return (
    <div className={authCardShell}>
      <div className="border-b border-amber-200/12 pb-5">
        <h1 className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/90">{t("login.signUpCardHeading")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t("login.signUpDescription")}</p>
      </div>

      {inviteFlow ? (
        <div className="mt-4 rounded-xl border border-amber-200/20 bg-amber-950/25 px-4 py-3 text-sm leading-relaxed text-amber-50/90">
          {t("login.inviteBannerRegister")}
        </div>
      ) : null}

      <form className="mt-8 space-y-6" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div>
          <label htmlFor="register-email" className="mb-2 block text-xs font-medium text-zinc-400">
            {t("login.email")}
          </label>
          <div className={underlineWrap}>
            <MailIcon className="mb-1 h-5 w-5 shrink-0 text-zinc-500" />
            <input
              id="register-email"
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
          <label htmlFor="register-password" className="mb-2 block text-xs font-medium text-zinc-400">
            {t("login.password")}
          </label>
          <div className={underlineWrap}>
            <LockIcon className="mb-1 h-5 w-5 shrink-0 text-zinc-500" />
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="register-confirm-password" className="mb-2 block text-xs font-medium text-zinc-400">
            {t("login.confirmPassword")}
          </label>
          <div className={underlineWrap}>
            <LockIcon className="mb-1 h-5 w-5 shrink-0 text-zinc-500" />
            <input
              id="register-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="flex h-12 w-full items-center justify-center rounded-full bg-amber-400 text-sm font-semibold uppercase tracking-wide text-stone-950 transition-opacity hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? t("login.pleaseWait") : t("login.signUpButton")}
        </button>

        <p className="text-center text-sm text-zinc-500">
          <Link href={loginHref} className="text-zinc-300 underline-offset-2 transition-colors hover:text-white hover:underline">
            {t("login.signUpBackToLogin")}
          </Link>
        </p>
      </form>

      {message ? (
        <div
          role="alert"
          className={[
            "mt-6 rounded-xl border px-3.5 py-3 text-sm leading-snug",
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
