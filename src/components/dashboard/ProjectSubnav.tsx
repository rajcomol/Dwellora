"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/provider";

export default function ProjectSubnav({ projectId }: { projectId: string }) {
  const pathname = usePathname() ?? "";
  const { t } = useI18n();
  const base = `/dashboard/projects/${projectId}`;
  const normalized = pathname.replace(/\/$/, "") || "/";
  const isOverview = normalized === base;
  const isFinances = normalized.startsWith(`${base}/finances`);
  const isPlanning = normalized.includes(`${base}/planning`);

  function tabClass(active: boolean) {
    return [
      "inline-flex rounded-xl px-4 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-renovation-surface font-medium text-renovation-steel"
        : "border border-renovation-border text-renovation-concrete hover:bg-renovation-muted hover:text-foreground",
    ].join(" ");
  }

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-renovation-border pb-3 dark:border-renovation-border"
      aria-label={t("projectSubnav.ariaLabel")}
    >
      <Link href={base} className={tabClass(isOverview)}>
        {t("projectSubnav.overview")}
      </Link>
      <Link href={`${base}/finances`} className={tabClass(isFinances)}>
        {t("projectSubnav.finances")}
      </Link>
      <Link href={`${base}/planning`} className={tabClass(isPlanning)}>
        {t("projectSubnav.planning")}
      </Link>
    </nav>
  );
}
