"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/provider";

const emptySubscribe = () => () => {};

function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export default function ThemePreferenceControl() {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const mounted = useIsClient();

  if (!mounted) {
    return <div className="h-11 max-w-md animate-pulse rounded-xl bg-renovation-muted dark:bg-zinc-800" aria-hidden />;
  }

  const current = theme ?? "system";
  const options = [
    { value: "light" as const, label: t("settings.themeLight") },
    { value: "dark" as const, label: t("settings.themeDark") },
    { value: "system" as const, label: t("settings.themeSystem") },
  ];

  return (
    <div className="space-y-2">
      <div
        className="inline-flex flex-wrap gap-1 rounded-xl border border-renovation-border bg-renovation-muted/80 p-1 dark:border-renovation-border dark:bg-zinc-900/50"
        role="group"
        aria-label={t("settings.themeLabel")}
      >
        {options.map((o) => {
          const active = current === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setTheme(o.value)}
              className={[
                "min-h-10 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-renovation-elevated text-zinc-900 shadow-sm dark:bg-renovation-elevated dark:text-zinc-50"
                  : "text-renovation-concrete hover:text-zinc-900 dark:hover:text-zinc-200",
              ].join(" ")}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-renovation-concrete">{t("settings.themeHint")}</p>
    </div>
  );
}
