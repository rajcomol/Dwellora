"use client";

import { useState } from "react";
import { LockIcon } from "@/components/auth/login-icons";
import { useI18n } from "@/i18n/provider";
import { signUpFormZodMessage } from "@/lib/validation/loginZodMessage";
import { updatePasswordFormSchema } from "@/lib/validation/schemas";
import { supabase } from "@/lib/supabase/client";

type Props = {
  redirectTo: string;
};

export default function RecoveryPasswordForm({ redirectTo }: Props) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setMessage(null);
    const parsed = updatePasswordFormSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setMessage({ type: "error", text: signUpFormZodMessage(t, parsed.error) });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setBusy(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setMessage({ type: "success", text: t("login.recoverySuccess") });
    window.setTimeout(() => {
      window.location.assign(redirectTo);
    }, 800);
  }

  const glass =
    "rounded-[2rem] border border-cyan-400/15 bg-gradient-to-b from-slate-950/90 to-slate-950/95 p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-10";
  const underlineWrap =
    "flex items-end gap-3 border-b border-cyan-200/20 pb-2 transition-colors focus-within:border-cyan-300/45";
  const inputClass =
    "min-h-[2.75rem] flex-1 border-0 bg-transparent text-sm text-zinc-50 outline-none ring-0 placeholder:text-zinc-500 focus:ring-0";

  return (
    <div className={glass}>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/90">{t("login.recoveryCardHeading")}</h2>
      <p className="mb-8 text-sm text-zinc-400">{t("login.recoveryDescription")}</p>

      <div className="space-y-6">
        <div>
          <label htmlFor="recovery-password" className="mb-2 block text-xs font-medium text-zinc-400">
            {t("login.password")}
          </label>
          <div className={underlineWrap}>
            <LockIcon className="mb-1 h-5 w-5 shrink-0 text-zinc-500" />
            <input
              id="recovery-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="recovery-confirm" className="mb-2 block text-xs font-medium text-zinc-400">
            {t("login.confirmPassword")}
          </label>
          <div className={underlineWrap}>
            <LockIcon className="mb-1 h-5 w-5 shrink-0 text-zinc-500" />
            <input
              id="recovery-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center rounded-full bg-cyan-400 text-sm font-semibold uppercase tracking-wide text-slate-950 transition-opacity hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? t("login.pleaseWait") : t("login.recoverySubmit")}
        </button>
      </div>

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
