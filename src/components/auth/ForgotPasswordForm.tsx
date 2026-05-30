"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authStyles } from "@/components/auth/auth-styles";
import { useI18n } from "@/i18n/provider";
import { forgotEmailSchema } from "@/lib/validation/schemas";
import { supabase } from "@/lib/supabase/client";
import { getPublicSiteUrlClient } from "@/lib/site-url";

export default function ForgotPasswordForm() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const backHref = next && next.startsWith("/") && !next.startsWith("//") ? `/login?next=${encodeURIComponent(next)}` : "/login";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const parsed = forgotEmailSchema.safeParse({ email });
    if (!parsed.success) {
      setMessage({ type: "error", text: t("login.forgotEmailRequired") });
      return;
    }
    const trimmed = parsed.data.email;
    setBusy(true);
    const base = getPublicSiteUrlClient() || window.location.origin;
    const redirectTo = `${base.replace(/\/$/, "")}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
    setBusy(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({ type: "success", text: t("login.forgotSuccess") });
  }

  return (
    <div>
      <h1 className="text-[1.5rem] font-medium text-[#1c1917]">{t("login.forgotCardHeading")}</h1>
      <p className="mt-1 text-sm text-[#78716c]">{t("login.forgotDescription")}</p>

      <form className="mt-7 space-y-5" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div>
          <label htmlFor="forgot-email" className={authStyles.label}>
            {t("login.email")}
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder={t("login.placeholderEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authStyles.input}
          />
        </div>

        <button type="submit" disabled={busy} className={authStyles.button}>
          {busy ? t("login.pleaseWait") : t("login.forgotSubmit")}
        </button>

        <p className="text-center text-sm text-[#78716c]">
          <Link href={backHref} className={authStyles.link}>
            {t("login.forgotBackToLogin")}
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
