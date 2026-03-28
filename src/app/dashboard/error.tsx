"use client";

import nl from "@/i18n/locales/nl.json";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error", error?.digest ?? error?.message ?? error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50/80 px-6 py-8 dark:border-red-900/60 dark:bg-red-950/30">
      <h1 className="text-lg font-semibold text-red-950 dark:text-red-100">{nl.errors.title}</h1>
      <p className="mt-2 text-sm text-red-900/90 dark:text-red-200/90">{nl.errors.description}</p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-red-800/80 dark:text-red-300/80">Ref: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-red-900 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 dark:bg-red-700 dark:hover:bg-red-600"
        >
          {nl.errors.retry}
        </button>
        <a
          href="/dashboard"
          className="inline-flex items-center rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-950 hover:bg-red-100 dark:border-red-800 dark:text-red-100 dark:hover:bg-red-950/50"
        >
          {nl.errors.dashboard}
        </a>
      </div>
    </div>
  );
}
