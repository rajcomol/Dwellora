import nl from "@/i18n/locales/nl.json";

/** Shown inside `DashboardShell` while a dashboard child segment is loading. */
export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy aria-live="polite">
      <span className="sr-only">{nl.common.loading}</span>
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-40 rounded bg-renovation-muted dark:bg-renovation-muted" />
        <div className="h-9 max-w-md rounded-lg bg-renovation-muted dark:bg-renovation-muted" />
        <div className="h-4 max-w-xl rounded bg-renovation-muted/80 dark:bg-renovation-muted/80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["a", "b", "c"].map((k) => (
          <div
            key={k}
            className="h-28 animate-pulse rounded-xl border border-renovation-border bg-renovation-elevated dark:border-renovation-border"
          />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl border border-dashed border-renovation-border bg-renovation-elevated/50 dark:border-renovation-border" />
    </div>
  );
}
