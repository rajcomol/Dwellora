"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import MoreMenuSheet from "@/components/layout/MoreMenuSheet";
import {
  MOBILE_PRIMARY_TABS,
  appendProjectQuery,
} from "@/components/layout/tab-nav-config";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useI18n } from "@/i18n/provider";

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { selectedProjectId } = useSelectedProject();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        data-tour="bottom-nav"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-renovation-border bg-renovation-elevated md:hidden dark:border-renovation-border dark:bg-renovation-elevated"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label={t("layout.bottomNav.ariaLabel")}
      >
        {MOBILE_PRIMARY_TABS.map((item) => {
          const active = item.match(pathname);
          const href = appendProjectQuery(item.href, selectedProjectId);
          return (
            <Link
              key={item.href}
              href={href}
              data-tour={item.tourTarget}
              className={[
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium",
                active ? "font-medium text-renovation-steel" : "text-renovation-concrete",
              ].join(" ")}
              aria-current={active ? "page" : undefined}
            >
              <span className="truncate">{t(item.labelKey)}</span>
            </Link>
          );
        })}
        <button
          type="button"
          data-testid="bottom-nav-more"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium text-renovation-concrete"
          onClick={() => setMoreOpen(true)}
        >
          {t("layout.bottomNav.more")}
        </button>
      </nav>
      <MoreMenuSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
