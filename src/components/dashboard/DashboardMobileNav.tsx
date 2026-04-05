"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { DASHBOARD_NAV_DEFS, dashboardNavLinkClass } from "@/components/dashboard/dashboard-nav";
import { useI18n } from "@/i18n/provider";

export default function DashboardMobileNav() {
  const { t } = useI18n();
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  return (
    <div className="lg:hidden" data-tour="nav-main">
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-renovation-border bg-renovation-muted/40 px-3 text-sm font-medium text-renovation-steel dark:border-renovation-border dark:bg-zinc-900/40 dark:text-zinc-100"
        aria-expanded={open}
        aria-controls="dashboard-mobile-nav-panel"
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        {t("shell.menu")}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label={t("common.close")}
            onClick={close}
          />
          <div
            ref={panelRef}
            id="dashboard-mobile-nav-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute left-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-r border-renovation-border bg-renovation-elevated shadow-lg dark:border-renovation-border dark:bg-renovation-elevated"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-renovation-border px-4 py-3 dark:border-renovation-border">
              <h2 id={titleId} className="text-sm font-semibold text-renovation-steel dark:text-zinc-100">
                {t("shell.sidebarSubtitle")}
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                className="min-h-11 min-w-11 rounded-lg px-2 text-sm font-medium text-zinc-700 hover:bg-renovation-muted dark:text-zinc-200 dark:hover:bg-zinc-900"
                onClick={close}
              >
                {t("common.close")}
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label={t("shell.menu")}>
              {DASHBOARD_NAV_DEFS.map(({ href, labelKey, match }) => (
                <Link key={href} href={href} className={dashboardNavLinkClass(match(pathname))} onClick={close}>
                  {t(labelKey)}
                </Link>
              ))}
            </nav>
            <div
              className="space-y-2 border-t border-renovation-border p-4 text-xs text-renovation-concrete dark:border-renovation-border"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            >
              <Link href="/privacy" className="block min-h-10 font-medium text-renovation-steel hover:underline dark:text-zinc-300" onClick={close}>
                {t("shell.privacyLink")}
              </Link>
              <Link href="/dashboard/help" className="block min-h-10 font-medium text-renovation-steel hover:underline dark:text-zinc-300" onClick={close}>
                {t("help.sidebarLink")}
              </Link>
              <Link href="/login" className="block min-h-10 font-medium text-renovation-steel hover:underline dark:text-zinc-300" onClick={close}>
                {t("nav.account")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
