"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { helpTopicForPath } from "@/lib/help/route-topic";
import { useI18n } from "@/i18n/provider";
import { useHelp } from "@/components/help/HelpProvider";

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

export default function HelpMenu() {
  const { t } = useI18n();
  const { startTour } = useHelp();
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const mounted = useClientMounted();

  const topic = helpTopicForPath(pathname);
  const contextHref = topic
    ? `/dashboard/help?topic=${encodeURIComponent(topic)}`
    : "/dashboard/help";

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

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        data-tour="help-button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-renovation-border bg-renovation-muted/40 px-3 text-sm font-medium text-renovation-steel transition-colors hover:bg-renovation-muted dark:border-renovation-border dark:bg-zinc-900/40 dark:text-zinc-100"
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
              {/*
                Desktop: niet `top: calc(100% + …)` t.o.v. de full-screen overlay — dat duwt het paneel onder de viewport.
                Vaste `top` t.o.v. viewport + portal naar body (zelfde patroon als GlobalChatLauncher).
              */}
              <div
                ref={panelRef}
                id="help-menu-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="fixed inset-x-0 bottom-0 z-[10061] max-h-[min(85dvh,520px)] overflow-y-auto rounded-t-2xl border border-renovation-border bg-renovation-elevated shadow-2xl dark:border-renovation-border dark:bg-renovation-elevated sm:inset-x-auto sm:bottom-auto sm:left-auto sm:right-4 sm:top-14 sm:max-h-[min(70dvh,440px)] sm:w-[min(100vw-2rem,20rem)] sm:rounded-xl"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
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
