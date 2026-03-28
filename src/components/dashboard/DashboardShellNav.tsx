"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/provider";

function matchProjectsNav(p: string) {
  if (!p.startsWith("/dashboard/projects")) return false;
  return !/\/projects\/[^/]+\/planning/.test(p);
}

function matchPlanningNav(p: string) {
  if (p === "/dashboard/planning" || p.startsWith("/dashboard/planning/")) return true;
  return /\/dashboard\/projects\/[^/]+\/planning/.test(p);
}

const NAV_DEFS = [
  { href: "/dashboard", labelKey: "nav.dashboard", match: (p: string) => p === "/dashboard" || p === "/dashboard/" },
  { href: "/dashboard/projects", labelKey: "nav.projects", match: matchProjectsNav },
  { href: "/dashboard/planning", labelKey: "nav.planning", match: matchPlanningNav },
  { href: "/dashboard/assistant", labelKey: "nav.assistant", match: (p: string) => p.startsWith("/dashboard/assistant") },
  { href: "/dashboard/documents", labelKey: "nav.documents", match: (p: string) => p.startsWith("/dashboard/documents") },
  { href: "/dashboard/settings", labelKey: "nav.settings", match: (p: string) => p.startsWith("/dashboard/settings") },
  { href: "/dashboard/reports", labelKey: "nav.reports", match: (p: string) => p.startsWith("/dashboard/reports") },
] as const;

function navClass(active: boolean) {
  return [
    "block rounded-xl px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-renovation-accent/15 text-renovation-steel dark:bg-renovation-accent/20 dark:text-renovation-accent"
      : "text-zinc-700 hover:bg-renovation-muted dark:text-zinc-300 dark:hover:bg-zinc-900",
  ].join(" ");
}

export default function DashboardShellNav() {
  const pathname = usePathname() ?? "";
  const { t } = useI18n();

  return (
    <nav className="mt-6 space-y-1">
      {NAV_DEFS.map(({ href, labelKey, match }) => (
        <Link key={href} href={href} className={navClass(match(pathname))}>
          {t(labelKey)}
        </Link>
      ))}
    </nav>
  );
}
