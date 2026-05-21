"use client";

import { useI18n } from "@/i18n/provider";

export type SettingsTab = "project" | "account";

type Props = {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  showProjectTab: boolean;
};

function subtabClass(active: boolean) {
  return [
    "inline-flex rounded-xl px-4 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-renovation-accent/15 text-renovation-steel dark:bg-renovation-accent/20 dark:text-renovation-accent"
      : "border border-renovation-border text-zinc-700 hover:bg-renovation-muted dark:border-renovation-border dark:text-zinc-200 dark:hover:bg-zinc-900",
  ].join(" ");
}

export default function SettingsSubtabNav({ activeTab, onTabChange, showProjectTab }: Props) {
  const { t } = useI18n();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-renovation-border pb-3 dark:border-renovation-border"
      aria-label={t("projectSettings.subnavAria")}
    >
      {showProjectTab ? (
        <button type="button" className={subtabClass(activeTab === "project")} onClick={() => onTabChange("project")}>
          {t("projectSettings.tabProject")}
        </button>
      ) : null}
      <button type="button" className={subtabClass(activeTab === "account")} onClick={() => onTabChange("account")}>
        {t("projectSettings.tabAccount")}
      </button>
    </nav>
  );
}
