"use client";

import { useI18n } from "@/i18n/provider";

export type RoomsTab = "rooms" | "overzicht";

type Props = {
  activeTab: RoomsTab;
  onTabChange: (tab: RoomsTab) => void;
};

function subtabClass(active: boolean) {
  return [
    "inline-flex rounded-xl px-4 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-renovation-surface font-medium text-renovation-steel"
      : "border border-renovation-border text-renovation-concrete hover:bg-renovation-muted hover:text-foreground",
  ].join(" ");
}

export default function RoomsSubtabNav({ activeTab, onTabChange }: Props) {
  const { t } = useI18n();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-renovation-border pb-3 dark:border-renovation-border"
      aria-label={t("rooms.subnavAria")}
    >
      <button
        type="button"
        data-testid="nav-tab-ruimtes"
        className={subtabClass(activeTab === "rooms")}
        onClick={() => onTabChange("rooms")}
      >
        {t("rooms.tabRooms")}
      </button>
      <button
        type="button"
        data-testid="nav-tab-projectoverzicht"
        className={subtabClass(activeTab === "overzicht")}
        onClick={() => onTabChange("overzicht")}
      >
        {t("rooms.tabOverview")}
      </button>
    </nav>
  );
}
