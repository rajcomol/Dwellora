"use client";

import { useI18n } from "@/i18n/provider";

export type SettingsTab = "project" | "account" | "oplevering";

type Props = {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  showProjectTab: boolean;
};

function subtabClass(active: boolean) {
  return [
    "inline-flex rounded-xl px-4 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-renovation-surface font-medium text-renovation-steel"
      : "border border-renovation-border text-renovation-concrete hover:bg-renovation-muted hover:text-foreground",
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
        <>
          <button
            type="button"
            data-testid="settings-tab-project"
            className={subtabClass(activeTab === "project")}
            onClick={() => onTabChange("project")}
          >
            {t("projectSettings.tabProject")}
          </button>
          <button
            type="button"
            data-testid="settings-tab-oplevering"
            className={subtabClass(activeTab === "oplevering")}
            onClick={() => onTabChange("oplevering")}
          >
            {t("projectSettings.tabHandover")}
          </button>
        </>
      ) : null}
      <button
        type="button"
        data-testid="settings-tab-account"
        className={subtabClass(activeTab === "account")}
        onClick={() => onTabChange("account")}
      >
        {t("projectSettings.tabAccount")}
      </button>
    </nav>
  );
}
