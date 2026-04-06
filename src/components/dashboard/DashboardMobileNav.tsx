"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { DASHBOARD_NAV_DEFS, dashboardNavLinkClass } from "@/components/dashboard/dashboard-nav";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useI18n } from "@/i18n/provider";

function useClientMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function HamburgerIcon({ className, open }: { className?: string; open: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {open ? (
        <path
          d="M6 6l12 12M18 6L6 18"
          className="stroke-current"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      ) : (
        <>
          <path d="M5 7h14" className="stroke-current" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M5 12h14" className="stroke-current" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M5 17h14" className="stroke-current" strokeWidth="1.75" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/**
 * Mobile nav overlay z-index: above sticky header (45) and Kluscoach FAB (40), below Help (10060) and chat open panel (59/60).
 */
const MOBILE_NAV_OVERLAY_Z = 10055;

export default function DashboardMobileNav() {
  const { t } = useI18n();
  const pathname = usePathname() ?? "";
  const [portalMounted, setPortalMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const mounted = useClientMounted();
  const wasOpenedRef = useRef(false);

  const close = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  useBodyScrollLock(portalMounted);

  useEffect(() => {
    if (!portalMounted) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [portalMounted, close]);

  useEffect(() => {
    if (!portalMounted) return;
    if (drawerOpen) {
      wasOpenedRef.current = true;
      queueMicrotask(() => closeBtnRef.current?.focus());
    }
  }, [portalMounted, drawerOpen]);

  useEffect(() => {
    if (portalMounted || !wasOpenedRef.current) return;
    const id = requestAnimationFrame(() => menuBtnRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [portalMounted]);

  useEffect(() => {
    if (!portalMounted) return;
    const id = requestAnimationFrame(() => setDrawerOpen(true));
    return () => cancelAnimationFrame(id);
  }, [portalMounted]);

  function handleOpenToggle() {
    if (portalMounted && drawerOpen) {
      close();
      return;
    }
    if (!portalMounted) {
      setPortalMounted(true);
      return;
    }
    setDrawerOpen(true);
  }

  function handlePanelTransitionEnd(e: React.TransitionEvent) {
    if (e.propertyName !== "transform") return;
    if (!drawerOpen) {
      setPortalMounted(false);
    }
  }

  const overlay =
    portalMounted && mounted ? (
      <div className="fixed inset-0" style={{ zIndex: MOBILE_NAV_OVERLAY_Z }} role="presentation">
        <button
          type="button"
          className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ease-out dark:bg-black/50 ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label={t("common.close")}
          onClick={close}
        />
        <div
          ref={panelRef}
          id="dashboard-mobile-nav-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onTransitionEnd={handlePanelTransitionEnd}
          className={`absolute left-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-r border-renovation-border bg-renovation-elevated shadow-lg transition-transform duration-200 ease-out dark:border-renovation-border dark:bg-renovation-elevated ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
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
    ) : null;

  return (
    <div className="lg:hidden" data-tour="nav-main">
      <button
        ref={menuBtnRef}
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-renovation-border bg-renovation-muted/40 px-3 text-sm font-medium text-renovation-steel transition-colors hover:bg-renovation-muted/60 dark:border-renovation-border dark:bg-zinc-900/40 dark:text-zinc-100"
        aria-expanded={portalMounted && drawerOpen}
        aria-controls="dashboard-mobile-nav-panel"
        aria-haspopup="dialog"
        aria-label={t("shell.openMenuAria")}
        onClick={handleOpenToggle}
      >
        <HamburgerIcon className="h-5 w-5 shrink-0" open={portalMounted && drawerOpen} />
      </button>

      {mounted ? createPortal(overlay, document.body) : null}
    </div>
  );
}
