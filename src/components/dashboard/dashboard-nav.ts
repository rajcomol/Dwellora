export function matchProjectsNav(p: string) {
  if (!p.startsWith("/dashboard/projects")) return false;
  return !/\/projects\/[^/]+\/planning/.test(p);
}

export function matchPlanningNav(p: string) {
  if (p === "/dashboard/planning" || p.startsWith("/dashboard/planning/")) return true;
  return /\/dashboard\/projects\/[^/]+\/planning/.test(p);
}

export const DASHBOARD_NAV_DEFS = [
  { href: "/dashboard", labelKey: "nav.dashboard", match: (p: string) => p === "/dashboard" || p === "/dashboard/" },
  { href: "/dashboard/projects", labelKey: "nav.projects", match: matchProjectsNav },
  { href: "/dashboard/planning", labelKey: "nav.planning", match: matchPlanningNav },
  { href: "/dashboard/documents", labelKey: "nav.documents", match: (p: string) => p.startsWith("/dashboard/documents") },
  { href: "/dashboard/settings", labelKey: "nav.settings", match: (p: string) => p.startsWith("/dashboard/settings") },
  { href: "/dashboard/reports", labelKey: "nav.reports", match: (p: string) => p.startsWith("/dashboard/reports") },
] as const;

export function dashboardNavLinkClass(active: boolean) {
  return [
    "block min-h-11 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
    active
      ? "bg-renovation-accent/15 text-renovation-steel dark:bg-renovation-accent/20 dark:text-renovation-accent"
      : "text-zinc-700 hover:bg-renovation-muted dark:text-zinc-300 dark:hover:bg-zinc-900",
  ].join(" ");
}
