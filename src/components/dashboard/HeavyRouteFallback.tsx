import nl from "@/i18n/locales/nl.json";

/** Inline fallback while a dynamically imported dashboard screen loads its JS chunk. */
export default function HeavyRouteFallback() {
  return (
    <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-renovation-border bg-renovation-elevated/40 px-6 py-12 dark:border-renovation-border">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-renovation-steel border-t-transparent dark:border-zinc-400"
        aria-hidden
      />
      <p className="text-sm text-renovation-concrete">{nl.common.loading}</p>
    </div>
  );
}
