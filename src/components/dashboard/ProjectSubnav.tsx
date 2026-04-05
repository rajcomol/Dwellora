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
        ? "bg-renovation-accent/15 text-renovation-steel dark:bg-renovation-accent/20 dark:text-renovation-accent"
        : "border border-renovation-border text-zinc-700 hover:bg-renovation-muted dark:border-renovation-border dark:text-zinc-200 dark:hover:bg-zinc-900",
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
