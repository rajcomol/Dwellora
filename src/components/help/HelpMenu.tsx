"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useHelp } from "@/components/help/HelpProvider";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { helpTopicForPath } from "@/lib/help/route-topic";
import { useI18n } from "@/i18n/provider";

function useClientMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function HelpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 18a1 1 0 100-2 1 1 0 000 2z"
        className="fill-current"
      />
      <path
        d="M12 14c-.8 0-1.5-.5-1.8-1.2a1 1 0 01.2-1.1c.4-.4.6-.9.6-1.4V10a1 1 0 112 0v.3c0 .9-.4 1.7-1 2.3l-.1.1a.3.3 0 00.1.3H12z"
        className="fill-current opacity-90"
      />
      <path
        d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 16a7 7 0 110-14 7 7 0 010 14z"
        className="fill-current"
      />
    </svg>
  );
}

/**
 * Anchored popover below/above the help trigger, clamped to the viewport.
 * Falls back to a top-aligned full-width panel on very narrow or tight layouts.
 */
function computeHelpPanelStyle(rect: DOMRect): CSSProperties {
  const gap = 8;
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const panelWidth = Math.min(320, vw - 2 * margin);
  const right = Math.max(margin, vw - rect.right);

  const topBelow = rect.bottom + gap;
  const spaceBelow = vh - topBelow - margin;
  const spaceAbove = rect.top - margin;
  const minComfort = 200;

  // Very narrow + little room: top-aligned sheet (not bottom sheet)
  if (vw < 380 && spaceBelow < 140) {
    const top = margin;
    return {
      position: "fixed",
      top,
      left: margin,
      right: margin,
      width: "auto",
      maxHeight: Math.min(vh * 0.88, vh - top - margin),
    };
  }

  if (spaceBelow >= minComfort || spaceBelow >= spaceAbove) {
    const maxHBelow = Math.min(vh * 0.7, spaceBelow);
    if (maxHBelow < 160 && spaceAbove > spaceBelow + 48) {
      return {
        position: "fixed",
        bottom: vh - rect.top + gap,
        right,
        width: panelWidth,
        maxHeight: Math.min(vh * 0.7, Math.max(120, spaceAbove - gap)),
      };
    }
    return {
      position: "fixed",
      top: topBelow,
      right,
      width: panelWidth,
      maxHeight: Math.max(140, Math.min(vh * 0.7, spaceBelow)),
    };
  }

  return {
    position: "fixed",
    bottom: vh - rect.top + gap,
    right,
    width: panelWidth,
    maxHeight: Math.min(vh * 0.7, Math.max(120, spaceAbove - gap)),
  };
}

export default function HelpMenu() {
  const { t } = useI18n();
  const { startTour } = useHelp();
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const mounted = useClientMounted();
  const wasOpenedRef = useRef(false);

  const topic = helpTopicForPath(pathname);
  const contextHref = topic
    ? `/dashboard/help?topic=${encodeURIComponent(topic)}`
    : "/dashboard/help";

  const close = useCallback(() => setOpen(false), []);

  useBodyScrollLock(open);

  useLayoutEffect(() => {
    if (!open) return;
    function updatePosition() {
      const el = triggerRef.current;
      if (!el) return;
      setPanelStyle(computeHelpPanelStyle(el.getBoundingClientRect()));
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      wasOpenedRef.current = true;
      queueMicrotask(() => closeBtnRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (open || !wasOpenedRef.current) return;
    const id = requestAnimationFrame(() => triggerRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        data-tour="help-button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-renovation-border/70 bg-renovation-muted/35 px-3 text-xs font-medium text-renovation-concrete transition-colors hover:border-renovation-border hover:bg-renovation-muted/60 hover:text-renovation-steel dark:border-renovation-border/80 dark:bg-zinc-900/35 dark:text-zinc-400 dark:hover:border-renovation-border dark:hover:bg-zinc-900/55 dark:hover:text-zinc-100"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? "help-menu-panel" : undefined}
        aria-label={t("help.buttonAria")}
        onClick={() => setOpen((o) => !o)}
      >
        <HelpIcon className="h-5 w-5 shrink-0" />
        <span className="hidden sm:inline">{t("help.menuOpenHelp")}</span>
      </button>

      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[10060]" role="presentation">
              <button
                type="button"
                className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
                aria-label={t("common.close")}
                onClick={close}
              />
              <div
                ref={panelRef}
                id="help-menu-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="fixed z-[10061] overflow-y-auto rounded-xl border border-renovation-border bg-renovation-elevated shadow-2xl dark:border-renovation-border dark:bg-renovation-elevated"
                style={{
                  ...panelStyle,
                  paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
                }}
              >
                <div className="flex items-start justify-between gap-2 border-b border-renovation-border px-4 py-3 dark:border-renovation-border">
                  <h2 id={titleId} className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {t("help.menuTitle")}
                  </h2>
                  <button
                    ref={closeBtnRef}
                    type="button"
                    className="min-h-11 min-w-11 shrink-0 rounded-lg px-2 text-sm text-zinc-700 hover:bg-renovation-muted dark:text-zinc-200 dark:hover:bg-zinc-900"
                    onClick={close}
                  >
                    {t("common.close")}
                  </button>
                </div>
                <nav className="flex flex-col gap-1 p-2 text-sm" aria-label={t("help.menuTitle")}>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-3 text-left font-medium text-zinc-900 hover:bg-renovation-muted dark:text-zinc-50 dark:hover:bg-zinc-900"
                    onClick={() => {
                      close();
                      startTour();
                    }}
                  >
                    {t("help.menuStartTour")}
                  </button>
                  <Link
                    href={contextHref}
                    className="rounded-lg px-3 py-3 font-medium text-zinc-900 hover:bg-renovation-muted dark:text-zinc-50 dark:hover:bg-zinc-900"
                    onClick={close}
                  >
                    {topic ? t("help.menuContextHelp") : t("help.menuContextNone")}
                  </Link>
                  <Link
                    href="/dashboard/help"
                    className="rounded-lg px-3 py-3 font-medium text-zinc-900 hover:bg-renovation-muted dark:text-zinc-50 dark:hover:bg-zinc-900"
                    onClick={close}
                  >
                    {t("help.menuKnowledgeBase")}
                  </Link>
                  <p className="px-3 py-2 text-xs text-renovation-concrete">{t("help.menuKluscoachHint")}</p>
                </nav>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
