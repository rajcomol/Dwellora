"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TAB_NAV_ITEMS,
  appendProjectQuery,
  tabNavLinkClass,
} from "@/components/layout/tab-nav-config";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useI18n } from "@/i18n/provider";

export default function TabNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { selectedProjectId } = useSelectedProject();

  return (
    <nav
      data-tour="tab-nav"
      className="sticky top-12 z-40 hidden border-b border-renovation-border bg-renovation-elevated/95 backdrop-blur md:flex dark:border-renovation-border dark:bg-renovation-elevated/90"
      aria-label={t("layout.tabNav.ariaLabel")}
    >
      <div className="flex w-full gap-1 overflow-x-auto px-4 py-2">
        {TAB_NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const href =
            item.labelKey === "nav.tabs.settings" && selectedProjectId
              ? `/dashboard/projects/${selectedProjectId}/settings`
              : appendProjectQuery(item.href, selectedProjectId);
          return (
            <Link
              key={item.href}
              href={href}
              className={tabNavLinkClass(active)}
              aria-current={active ? "page" : undefined}
            >
              {t(item.labelKey)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
