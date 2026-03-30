"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { MailIcon } from "@/components/auth/login-icons";
import { forgotEmailSchema } from "@/lib/validation/schemas";
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
    const parsed = forgotEmailSchema.safeParse({ email });
    if (!parsed.success) {
      setMessage({ type: "error", text: t("login.forgotEmailRequired") });
      return;
    }
    const trimmed = parsed.data.email;
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
    "rounded-[2rem] border border-cyan-400/15 bg-gradient-to-b from-slate-950/90 to-slate-950/95 p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-10";
  const underlineWrap =
    "flex items-end gap-3 border-b border-cyan-200/20 pb-2 transition-colors focus-within:border-cyan-300/45";
  const inputClass =
    "min-h-[2.75rem] flex-1 border-0 bg-transparent text-sm text-zinc-50 outline-none ring-0 placeholder:text-zinc-500 focus:ring-0";

  return (
    <div className={glass}>
      <div className="border-b border-cyan-400/10 pb-5">
        <h1 className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/90">{t("login.forgotCardHeading")}</h1>
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
          className="flex h-12 w-full items-center justify-center rounded-full bg-cyan-400 text-sm font-semibold uppercase tracking-wide text-slate-950 transition-opacity hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
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
