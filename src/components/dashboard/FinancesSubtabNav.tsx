"use client";

import { useI18n } from "@/i18n/provider";

export type FinancesTab = "overzicht" | "kostenraming" | "declaraties" | "uitgaven" | "rapporten";

type Props = {
  activeTab: FinancesTab;
  onTabChange: (tab: FinancesTab) => void;
};

function subtabClass(active: boolean) {
  return [
    "inline-flex rounded-xl px-4 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-renovation-surface font-medium text-renovation-steel"
      : "border border-renovation-border text-renovation-concrete hover:bg-renovation-muted hover:text-foreground",
  ].join(" ");
}

export default function FinancesSubtabNav({ activeTab, onTabChange }: Props) {
  const { t } = useI18n();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-renovation-border pb-3 dark:border-renovation-border"
      aria-label={t("finances.subnavAria")}
    >
      <button
        type="button"
        data-testid="finances-tab-overzicht"
        className={subtabClass(activeTab === "overzicht")}
        onClick={() => onTabChange("overzicht")}
      >
        {t("finances.tabs.overview")}
      </button>
      <button
        type="button"
        data-testid="finances-tab-kostenraming"
        className={subtabClass(activeTab === "kostenraming")}
        onClick={() => onTabChange("kostenraming")}
      >
        {t("finances.tabs.kostenraming")}
      </button>
      <button
        type="button"
        data-testid="finances-tab-declaraties"
        className={subtabClass(activeTab === "declaraties")}
        onClick={() => onTabChange("declaraties")}
      >
        {t("finances.tabs.declarations")}
      </button>
      <button
        type="button"
        data-testid="finances-tab-uitgaven"
        className={subtabClass(activeTab === "uitgaven")}
        onClick={() => onTabChange("uitgaven")}
      >
        {t("finances.tabs.expenses")}
      </button>
      <button
        type="button"
        data-testid="finances-tab-rapporten"
        className={subtabClass(activeTab === "rapporten")}
        onClick={() => onTabChange("rapporten")}
      >
        {t("finances.tabs.reports")}
      </button>
    </nav>
  );
}
