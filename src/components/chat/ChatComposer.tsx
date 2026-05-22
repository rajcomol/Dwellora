"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { chatComposerMessageSchema } from "@/lib/validation/schemas";

function SendSpinner() {
  return (
    <span
      className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/35 border-t-white dark:border-black/25 dark:border-t-black"
      aria-hidden
    />
  );
}

export default function ChatComposer({
  onSend,
  disabled,
  pending,
}: {
  onSend: (message: string) => void;
  disabled?: boolean;
  /** Tijdens API-verzoek: visuele laadstatus en aria-busy. */
  pending?: boolean;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const isBusy = Boolean(pending);

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      aria-busy={isBusy}
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        const parsed = chatComposerMessageSchema.safeParse(value);
        if (!parsed.success) return;
        onSend(parsed.data);
        setValue("");
      }}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor="chat-composer-message" className="mb-1 block text-xs font-medium text-renovation-concrete">
          {t("chat.messageLabel")}
        </label>
        <input
          id="chat-composer-message"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("chat.placeholder")}
          disabled={disabled}
          className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm outline-none focus:border-renovation-steel disabled:cursor-not-allowed disabled:opacity-60 dark:border-renovation-border dark:bg-renovation-elevated"
        />
      </div>
      <Button
        type="submit"
        disabled={disabled}
        className="w-full min-w-[7.5rem] sm:w-auto"
        aria-disabled={disabled}
      >
        {isBusy ? (
          <span className="inline-flex items-center justify-center gap-2">
            <SendSpinner />
            <span className="max-w-[10rem] truncate sm:max-w-none">{t("chat.sending")}</span>
          </span>
        ) : (
          t("chat.send")
        )}
      </Button>
    </form>
  );
}
