"use client";

import { useEffect, useRef, useState } from "react";

const PANNELLUM_VERSION = "2.5.6";
const PANNELLUM_CSS = `https://cdnjs.cloudflare.com/ajax/libs/pannellum/${PANNELLUM_VERSION}/pannellum.css`;
const PANNELLUM_JS = `https://cdnjs.cloudflare.com/ajax/libs/pannellum/${PANNELLUM_VERSION}/pannellum.js`;

type PannellumViewer = { destroy: () => void };
type PannellumApi = {
  viewer: (el: HTMLElement | string, config: Record<string, unknown>) => PannellumViewer;
};

declare global {
  interface Window {
    pannellum?: PannellumApi;
  }
}

let loaderPromise: Promise<void> | null = null;

/** Laadt Pannellum (CSS + JS) eenmalig via cdnjs. */
function loadPannellum(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.pannellum) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[data-pannellum]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = PANNELLUM_CSS;
      link.setAttribute("data-pannellum", "true");
      document.head.appendChild(link);
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[data-pannellum]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Pannellum kon niet laden.")));
      return;
    }
    const script = document.createElement("script");
    script.src = PANNELLUM_JS;
    script.async = true;
    script.setAttribute("data-pannellum", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Pannellum kon niet laden."));
    document.body.appendChild(script);
  });
  return loaderPromise;
}

type Props = {
  src: string | null;
  open: boolean;
  onClose: () => void;
  closeLabel?: string;
};

export default function PanoramaViewer({ src, open, onClose, closeLabel = "Sluiten" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PannellumViewer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !src) return;
    let cancelled = false;
    setError(null);

    loadPannellum()
      .then(() => {
        if (cancelled || !containerRef.current || !window.pannellum) return;
        viewerRef.current = window.pannellum.viewer(containerRef.current, {
          type: "equirectangular",
          panorama: src,
          autoLoad: true,
          autoRotate: -2,
          showControls: true,
          hfov: 110,
        });
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
      try {
        viewerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      viewerRef.current = null;
    };
  }, [open, src]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10050] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="360 graden weergave"
      data-testid="panorama-modal"
    >
      <div className="flex items-center justify-end p-3">
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          data-testid="panorama-close"
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
        >
          {closeLabel}
        </button>
      </div>
      <div className="relative flex-1">
        {error ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">{error}</div>
        ) : (
          <div ref={containerRef} className="absolute inset-0" data-testid="panorama-canvas" />
        )}
      </div>
    </div>
  );
}
