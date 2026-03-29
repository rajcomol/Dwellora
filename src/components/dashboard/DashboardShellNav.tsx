"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DASHBOARD_NAV_DEFS, dashboardNavLinkClass } from "@/components/dashboard/dashboard-nav";
import { useI18n } from "@/i18n/provider";

export default function DashboardShellNav() {
  const pathname = usePathname() ?? "";
  const { t } = useI18n();

  return (
    <nav className="mt-6 space-y-1">
      {DASHBOARD_NAV_DEFS.map(({ href, labelKey, match }) => (
        <Link key={href} href={href} className={dashboardNavLinkClass(match(pathname))}>
          {t(labelKey)}
        </Link>
      ))}
    </nav>
  );
}
