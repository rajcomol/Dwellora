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

/** Full-width top sheet on narrow viewports — avoids anchor math (bad rects break `right:` popovers). */
function getMobileHelpTopSheetStyle(): CSSProperties {
  return {
    position: "fixed",
    left: 0,
    right: 0,
    top: "max(env(safe-area-inset-top), 0px)",
    bottom: "auto",
    width: "100%",
    maxHeight: "min(85dvh, 520px)",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: "1rem",
    borderBottomRightRadius: "1rem",
  };
}

/** Avoids a frame with `position:fixed` and no insets (browser pins to top-left). */
function getFallbackPanelStyle(): CSSProperties {
  if (typeof window === "undefined") return getMobileHelpTopSheetStyle();
  return window.innerWidth < 640
    ? getMobileHelpTopSheetStyle()
    : {
        position: "fixed",
        top: "max(0.75rem, env(safe-area-inset-top))",
        left: "50%",
        transform: "translateX(-50%)",
        width: Math.min(320, window.innerWidth - 16),
        maxHeight: "min(70dvh, 560px)",
      };
}

function clampPopoverRight(vw: number, margin: number, panelWidth: number, rect: DOMRect): number {
  const raw = vw - rect.right;
  const upper = vw - margin - panelWidth;
  if (upper < margin) return margin;
  return Math.max(margin, Math.min(raw, upper));
}

/**
 * Anchored popover below/above the help trigger (sm+). Mobile: top sheet only.
 */
function computeHelpPanelStyle(rect: DOMRect): CSSProperties {
  const gap = 8;
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const panelWidth = Math.min(320, vw - 2 * margin);

  if (vw < 640) {
    return getMobileHelpTopSheetStyle();
  }

  const right = clampPopoverRight(vw, margin, panelWidth, rect);

  if (rect.width < 2 || rect.height < 2 || !Number.isFinite(rect.top)) {
    return {
      position: "fixed",
      top: "max(0.75rem, env(safe-area-inset-top))",
      left: "50%",
      transform: "translateX(-50%)",
      width: panelWidth,
      maxHeight: "min(70dvh, 560px)",
    };
  }

  const topBelow = rect.bottom + gap;
  const spaceBelow = vh - topBelow - margin;
  const spaceAbove = rect.top - margin;
  const minComfort = 200;

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
  const openRef = useRef(false);
  const titleId = useId();
  const mounted = useClientMounted();
  const wasOpenedRef = useRef(false);

  openRef.current = open;

  const topic = helpTopicForPath(pathname);
  const contextHref = topic
    ? `/dashboard/help?topic=${encodeURIComponent(topic)}`
    : "/dashboard/help";

  const close = useCallback(() => setOpen(false), []);

  const resolvedPanelStyle =
    open && (panelStyle as { position?: string }).position === undefined
      ? getFallbackPanelStyle()
      : panelStyle;
  const mobileSheetLayout =
    mounted && open && typeof window !== "undefined" && window.innerWidth < 640;

  useBodyScrollLock(open);

  useLayoutEffect(() => {
    if (!open) return;
    function updatePosition() {
      if (!openRef.current) return;
      const el = triggerRef.current;
      if (!el) {
        setPanelStyle(computeHelpPanelStyle(new DOMRect(0, 0, 0, 0)));
        return;
      }
      setPanelStyle(computeHelpPanelStyle(el.getBoundingClientRect()));
    }
    updatePosition();
    const raf = requestAnimationFrame(() => {
      if (!openRef.current) return;
      updatePosition();
    });
    /**
     * Narrow: panel style is fixed to the viewport; do not subscribe to window scroll or resize.
     * Both can fire in bursts (fixed body, mobile URL bar / visualViewport) and cause repeated setPanelStyle.
     * Desktop: keep resize + scroll so the popover tracks the trigger.
     */
    const narrow = typeof window !== "undefined" && window.innerWidth < 640;
    if (!narrow) {
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (!narrow) {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      }
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
    } else {
      setPanelStyle({});
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
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-renovation-border/70 bg-renovation-muted/35 px-3 text-xs font-medium text-renovation-concrete transition-colors hover:border-renovation-border hover:bg-renovation-muted/60 hover:text-renovation-steel dark:border-renovation-border/80 dark:bg-renovation-muted/35 dark:text-renovation-concrete dark:hover:border-renovation-border dark:hover:bg-renovation-muted/55 dark:hover:text-foreground"
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
                className={[
                  "fixed z-[10061] overflow-y-auto overscroll-contain border border-renovation-border bg-renovation-elevated shadow-2xl dark:border-renovation-border dark:bg-renovation-elevated",
                  mobileSheetLayout ? "rounded-t-none rounded-b-2xl" : "rounded-xl",
                ].join(" ")}
                style={{
                  ...resolvedPanelStyle,
                  paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
                }}
              >
                <div className="flex items-start justify-between gap-2 border-b border-renovation-border px-4 py-3 dark:border-renovation-border">
                  <h2 id={titleId} className="text-base font-semibold text-foreground">
                    {t("help.menuTitle")}
                  </h2>
                  <button
                    ref={closeBtnRef}
                    type="button"
                    className="min-h-11 min-w-11 shrink-0 rounded-lg px-2 text-sm text-foreground hover:bg-renovation-muted dark:hover:bg-renovation-muted"
                    onClick={close}
                  >
                    {t("common.close")}
                  </button>
                </div>
                <nav className="flex flex-col gap-1 p-2 text-sm" aria-label={t("help.menuTitle")}>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-3 text-left font-medium text-foreground hover:bg-renovation-muted dark:hover:bg-renovation-muted"
                    onClick={() => {
                      close();
                      startTour();
                    }}
                  >
                    {t("help.menuStartTour")}
                  </button>
                  <Link
                    href={contextHref}
                    className="rounded-lg px-3 py-3 font-medium text-foreground hover:bg-renovation-muted dark:hover:bg-renovation-muted"
                    onClick={close}
                  >
                    {topic ? t("help.menuContextHelp") : t("help.menuContextNone")}
                  </Link>
                  <Link
                    href="/dashboard/help"
                    className="rounded-lg px-3 py-3 font-medium text-foreground hover:bg-renovation-muted dark:hover:bg-renovation-muted"
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
