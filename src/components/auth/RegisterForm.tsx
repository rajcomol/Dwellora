"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authStyles } from "@/components/auth/auth-styles";
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
    if (busy) return;
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

  return (
    <div>
      <h1 className="text-[1.5rem] font-medium text-[#1c1917]">{t("login.signUpCardHeading")}</h1>
      <p className="mt-1 text-sm text-[#78716c]">{t("login.signUpDescription")}</p>

      {inviteFlow ? (
        <div className="mt-6 rounded-lg border border-[#e8dfd0] bg-[#fbf7ef] px-4 py-3 text-sm leading-relaxed text-[#57534e]">
          {t("login.inviteBannerRegister")}
        </div>
      ) : null}

      <form className="mt-7 space-y-5" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div>
          <label htmlFor="register-email" className={authStyles.label}>
            {t("login.email")}
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder={t("login.placeholderEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authStyles.input}
          />
        </div>
        <div>
          <label htmlFor="register-password" className={authStyles.label}>
            {t("login.password")}
          </label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authStyles.input}
          />
        </div>
        <div>
          <label htmlFor="register-confirm-password" className={authStyles.label}>
            {t("login.confirmPassword")}
          </label>
          <input
            id="register-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={authStyles.input}
          />
        </div>

        <button type="submit" disabled={busy} className={authStyles.button}>
          {busy ? t("login.pleaseWait") : t("login.signUpButton")}
        </button>

        <p className="text-center text-sm text-[#78716c]">
          <Link href={loginHref} className={authStyles.link}>
            {t("login.signUpBackToLogin")}
          </Link>
        </p>
      </form>

      {message ? (
        <div role="alert" className={authStyles.alert(message.type)}>
          {message.text}
        </div>
      ) : null}
    </div>
  );
}
