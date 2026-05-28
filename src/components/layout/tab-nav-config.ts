export type TabNavItem = {
  href: string;
  labelKey: string;
  match: (pathname: string) => boolean;
  /** Shown in bottom nav (max 4 primary + more) */
  primaryMobile?: boolean;
};

export function matchDashboard(path: string) {
  return path === "/dashboard" || path === "/dashboard/";
}

export function matchPlanning(path: string) {
  return path === "/dashboard/planning" || path.startsWith("/dashboard/planning/");
}

export function matchRooms(path: string) {
  return path === "/dashboard/rooms" || path.startsWith("/dashboard/rooms/");
}

export function matchQuotes(path: string) {
  return path.startsWith("/dashboard/quotes");
}

export function matchFinances(path: string) {
  return path.startsWith("/dashboard/finances");
}

export function matchSettings(path: string) {
  return (
    path.startsWith("/dashboard/settings") ||
    /\/dashboard\/projects\/[^/]+\/settings/.test(path)
  );
}

export const TAB_NAV_ITEMS: TabNavItem[] = [
  { href: "/dashboard", labelKey: "nav.tabs.dashboard", match: matchDashboard, primaryMobile: true },
  { href: "/dashboard/rooms", labelKey: "nav.tabs.rooms", match: matchRooms, primaryMobile: true },
  { href: "/dashboard/planning", labelKey: "nav.tabs.planning", match: matchPlanning, primaryMobile: true },
  { href: "/dashboard/finances", labelKey: "nav.tabs.finances", match: matchFinances, primaryMobile: true },
  { href: "/dashboard/quotes", labelKey: "nav.tabs.quotes", match: matchQuotes },
  { href: "/dashboard/settings", labelKey: "nav.tabs.settings", match: matchSettings },
];

export const MOBILE_PRIMARY_TABS = TAB_NAV_ITEMS.filter((t) => t.primaryMobile);
export const MOBILE_MORE_TABS = TAB_NAV_ITEMS.filter((t) => !t.primaryMobile);

export function tabNavLinkClass(active: boolean) {
  return [
    "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-renovation-surface font-medium text-renovation-steel"
      : "text-renovation-concrete hover:bg-renovation-muted hover:text-foreground",
  ].join(" ");
}

export function appendProjectQuery(href: string, projectId: string | null): string {
  if (!projectId) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}project=${encodeURIComponent(projectId)}`;
}
