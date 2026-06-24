"use client";

import { useState, type FormEvent } from "react";
import { authStyles } from "@/components/auth/auth-styles";
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
    if (busy) return;
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

  return (
    <div>
      <h1 className="text-[1.5rem] font-medium text-[#1c1917]">{t("login.recoveryCardHeading")}</h1>
      <p className="mt-1 text-sm text-[#78716c]">{t("login.recoveryDescription")}</p>

      <form
        className="mt-7 space-y-5"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void handleSubmit();
        }}
        noValidate
      >
        <div>
          <label htmlFor="recovery-password" className={authStyles.label}>
            {t("login.password")}
          </label>
          <input
            id="recovery-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authStyles.input}
          />
        </div>
        <div>
          <label htmlFor="recovery-confirm" className={authStyles.label}>
            {t("login.confirmPassword")}
          </label>
          <input
            id="recovery-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={authStyles.input}
          />
        </div>

        <button type="submit" disabled={busy} className={authStyles.button}>
          {busy ? t("login.pleaseWait") : t("login.recoverySubmit")}
        </button>
      </form>

      {message ? (
        <div role="alert" className={authStyles.alert(message.type)}>
          {message.text}
        </div>
      ) : null}
    </div>
  );
}
