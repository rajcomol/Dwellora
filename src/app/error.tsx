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

  /* Segment error boundary: geen <html>/<body> — die komen uit de root layout. */
  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center bg-renovation-elevated px-6 py-16 text-foreground dark:bg-renovation-elevated">
      <h1 className="text-2xl font-semibold">{nl.errors.title}</h1>
      <p className="mt-3 text-sm text-renovation-concrete">{nl.errors.description}</p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-renovation-concrete">Ref: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-renovation-accent px-4 py-2 text-sm font-medium text-white hover:bg-renovation-steel"
        >
          {nl.errors.retry}
        </button>
        <a
          href="/dashboard"
          className="inline-flex items-center rounded-md border border-renovation-border px-4 py-2 text-sm font-medium text-foreground hover:bg-renovation-surface dark:border-renovation-border dark:hover:bg-renovation-muted"
        >
          {nl.errors.dashboard}
        </a>
      </div>
    </div>
  );
}
