"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { signUpFormZodMessage } from "@/lib/validation/loginZodMessage";
import { updatePasswordFormSchema } from "@/lib/validation/schemas";
import { supabase } from "@/lib/supabase/client";

export default function SettingsChangePasswordForm() {
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
      setMessage({ type: "error", text: t("settings.passwordChangeError") });
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setMessage({ type: "success", text: t("settings.passwordChangeSuccess") });
  }

  const fieldClass =
    "mt-1 w-full min-h-11 rounded-lg border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm text-foreground outline-none ring-renovation-accent/30 placeholder:text-renovation-concrete focus:ring-2 dark:border-renovation-border dark:bg-renovation-elevated dark:text-foreground";

  return (
    <div className="space-y-4">
      <p className="text-sm text-renovation-concrete">{t("settings.passwordChangeHint")}</p>
      <div>
        <label htmlFor="settings-new-password" className="text-sm font-medium text-foreground">
          {t("settings.passwordNew")}
        </label>
        <input
          id="settings-new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="settings-confirm-password" className="text-sm font-medium text-foreground">
          {t("settings.passwordConfirm")}
        </label>
        <input
          id="settings-confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={fieldClass}
        />
      </div>
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-renovation-steel px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-renovation-accent dark:text-renovation-accent-foreground"
      >
        {busy ? t("common.loading") : t("settings.passwordSave")}
      </button>
      {message ? (
        <div
          role="alert"
          className={[
            "rounded-lg border px-3 py-2 text-sm",
            message.type === "error"
              ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100",
          ].join(" ")}
        >
          {message.text}
        </div>
      ) : null}
    </div>
  );
}
