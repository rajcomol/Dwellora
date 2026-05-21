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
      ? "bg-renovation-accent/15 text-renovation-steel dark:bg-renovation-accent/20 dark:text-renovation-accent"
      : "border border-renovation-border text-zinc-700 hover:bg-renovation-muted dark:border-renovation-border dark:text-zinc-200 dark:hover:bg-zinc-900",
  ].join(" ");
}

export default function RoomsSubtabNav({ activeTab, onTabChange }: Props) {
  const { t } = useI18n();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-renovation-border pb-3 dark:border-renovation-border"
      aria-label={t("rooms.subnavAria")}
    >
      <button type="button" className={subtabClass(activeTab === "rooms")} onClick={() => onTabChange("rooms")}>
        {t("rooms.tabRooms")}
      </button>
      <button type="button" className={subtabClass(activeTab === "overzicht")} onClick={() => onTabChange("overzicht")}>
        {t("rooms.tabOverview")}
      </button>
    </nav>
  );
}
