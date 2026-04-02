import nl from "@/i18n/locales/nl.json";
import { Skeleton } from "@/components/ui/Skeleton";

/** Inline fallback while a dynamically imported dashboard screen loads its JS chunk. */
export default function HeavyRouteFallback() {
  return (
    <div
      className="flex min-h-[12rem] flex-col gap-4 rounded-xl border border-dashed border-renovation-border bg-renovation-elevated/40 px-6 py-8 dark:border-renovation-border"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{nl.common.loading}</span>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}
