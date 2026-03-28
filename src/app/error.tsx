"use client";

import nl from "@/i18n/locales/nl.json";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error", error?.digest ?? error?.message ?? error);
  }, [error]);

  return (
    <html lang="nl">
      <body className="mx-auto flex min-h-full max-w-lg flex-col justify-center bg-white px-6 py-16 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <h1 className="text-2xl font-semibold">{nl.errors.title}</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{nl.errors.description}</p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-zinc-500">Ref: {error.digest}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {nl.errors.retry}
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            {nl.errors.dashboard}
          </a>
        </div>
      </body>
    </html>
  );
}
