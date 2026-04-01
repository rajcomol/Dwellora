"use client";

import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import HeavyRouteFallback from "@/components/dashboard/HeavyRouteFallback";
import { useProjectIdFromDashboardPath } from "@/components/dashboard/useProjectIdFromDashboardPath";
import { useI18n } from "@/i18n/provider";

const ChatPanelContent = dynamic(() => import("@/components/chat/ChatPanelContent"), {
  ssr: false,
  loading: () => <HeavyRouteFallback />,
});

function useClientMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function KluscoachFabIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-7 w-7"
      aria-hidden
    >
      <path
        d="M6 3h7q2 0 2 2v6q0 2-2 2H9.2L8 16.3 6.8 13H6q-2 0-2-2V5q0-2 2-2z"
        className="fill-renovation-accent"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 8h5.5M5.5 10.25h4"
        className="stroke-white dark:stroke-zinc-900"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <g transform="translate(8.75 4.25) rotate(-36 7.25 9.5)">
        <rect
          x="6.5"
          y="0"
          width="5.5"
          height="3.25"
          rx="0.65"
          className="fill-white stroke-current dark:fill-zinc-900"
          strokeWidth="0.85"
        />
        <rect
          x="8"
          y="2.85"
          width="2.35"
          height="11.25"
          rx="0.55"
          className="fill-white stroke-current dark:fill-zinc-900"
          strokeWidth="0.85"
        />
      </g>
    </svg>
  );
}

export default function GlobalChatLauncher() {
  const { t } = useI18n();
  const routeProjectId = useProjectIdFromDashboardPath();
  const [open, setOpen] = useState(false);
  const mounted = useClientMounted();
  const titleId = useId();
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    wasOpenedRef.current = true;
    queueMicrotask(() => closeBtnRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (open || !wasOpenedRef.current) return;
    const id = requestAnimationFrame(() => fabRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const onBackdropClick = useCallback(() => setOpen(false), []);

  const panel = open ? (
    <div className="fixed inset-0 z-[59] pointer-events-none">
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 bg-black/40 backdrop-blur-[1px] dark:bg-black/50"
        aria-label={t("common.close")}
        onClick={onBackdropClick}
      />
      <div
        className="pointer-events-auto absolute inset-x-0 bottom-0 z-[60] flex h-[min(92dvh,720px)] flex-col rounded-t-2xl border border-renovation-border bg-renovation-elevated shadow-2xl dark:border-renovation-border dark:bg-renovation-elevated sm:inset-auto sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:right-[max(1.25rem,env(safe-area-inset-right))] sm:h-[min(85dvh,640px)] sm:w-[min(100vw-2rem,28rem)] sm:rounded-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-renovation-border px-4 py-3 dark:border-renovation-border">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-renovation-steel dark:text-zinc-100">
              {t("chat.panelTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{t("chat.panelSubtitle")}</p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="min-h-11 min-w-11 shrink-0 rounded-lg border border-transparent px-2 text-sm font-medium text-zinc-700 hover:bg-renovation-muted dark:text-zinc-200 dark:hover:bg-zinc-900"
            onClick={() => setOpen(false)}
          >
            {t("common.close")}
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
          <ChatPanelContent routeSuggestedProjectId={routeProjectId} />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {mounted ? createPortal(panel, document.body) : null}
      {!open ? (
        <button
          ref={fabRef}
          type="button"
          title={t("chat.launcherTitle")}
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 flex h-14 w-14 items-center justify-center rounded-full border border-renovation-border bg-renovation-elevated text-renovation-steel shadow-lg transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-renovation-accent dark:border-renovation-border dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          aria-label={t("chat.launcherAriaLabel")}
          aria-expanded={false}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <KluscoachFabIcon />
        </button>
      ) : null}
    </>
  );
}
