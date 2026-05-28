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
  { href: "/dashboard/finances", labelKey: "nav.finances", match: (p: string) => p.startsWith("/dashboard/finances") },
  { href: "/dashboard/quotes", labelKey: "nav.documents", match: (p: string) => p.startsWith("/dashboard/quotes") },
  { href: "/dashboard/settings", labelKey: "nav.settings", match: (p: string) => p.startsWith("/dashboard/settings") },
] as const;

export function dashboardNavLinkClass(active: boolean) {
  return [
    "block min-h-11 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
    active
      ? "bg-renovation-surface font-medium text-renovation-steel"
      : "text-renovation-concrete hover:bg-renovation-muted hover:text-foreground",
  ].join(" ");
}
