"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { chatComposerMessageSchema } from "@/lib/validation/schemas";

export default function ChatComposer({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState("");

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-start"
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        const parsed = chatComposerMessageSchema.safeParse(value);
        if (!parsed.success) return;
        onSend(parsed.data);
        setValue("");
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("chat.placeholder")}
        disabled={disabled}
        className="w-full flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950"
      />
      <Button type="submit" disabled={disabled} className="w-full sm:w-auto">
        {t("chat.send")}
      </Button>
    </form>
  );
}
