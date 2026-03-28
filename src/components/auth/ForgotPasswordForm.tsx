"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { MailIcon } from "@/components/auth/login-icons";
import { supabase } from "@/lib/supabase/client";

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
    const trimmed = email.trim();
    if (!trimmed) {
      setMessage({ type: "error", text: t("login.forgotEmailRequired") });
      return;
    }
    setBusy(true);
    const redirectTo = `${window.location.origin}/login`;
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
    setBusy(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({ type: "success", text: t("login.forgotSuccess") });
  }

  const glass =
    "rounded-[2rem] border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950/85 p-8 shadow-2xl backdrop-blur-xl sm:p-10";
  const underlineWrap =
    "flex items-end gap-3 border-b border-white/25 pb-2 transition-colors focus-within:border-white/55";
  const inputClass =
    "min-h-[2.75rem] flex-1 border-0 bg-transparent text-sm text-zinc-50 outline-none ring-0 placeholder:text-zinc-500 focus:ring-0";

  return (
    <div className={glass}>
      <div className="border-b border-white/10 pb-5">
        <h1 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">{t("login.forgotCardHeading")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t("login.forgotDescription")}</p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div>
          <label htmlFor="forgot-email" className="sr-only">
            {t("login.email")}
          </label>
          <div className={underlineWrap}>
            <MailIcon className="mb-1 h-5 w-5 shrink-0 text-zinc-500" />
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder={t("login.placeholderEmail")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="flex h-12 w-full items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold uppercase tracking-wide text-zinc-900 transition-opacity hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? t("login.pleaseWait") : t("login.forgotSubmit")}
        </button>

        <p className="text-center text-sm text-zinc-500">
          <Link href={backHref} className="text-zinc-300 underline-offset-2 transition-colors hover:text-white hover:underline">
            {t("login.forgotBackToLogin")}
          </Link>
        </p>
      </form>

      {message ? (
        <div
          role="alert"
          className={[
            "mt-6 rounded-xl border px-3.5 py-3 text-sm leading-snug",
            message.type === "error"
              ? "border-red-400/40 bg-red-950/40 text-red-100"
              : "border-emerald-400/30 bg-emerald-950/35 text-emerald-100",
          ].join(" ")}
        >
          {message.text}
        </div>
      ) : null}
    </div>
  );
}
