import type { HTMLAttributes } from "react";

const baseClass =
  "rounded-md bg-renovation-muted/90 dark:bg-renovation-muted/90 motion-safe:animate-pulse motion-reduce:animate-none";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** Basis skeleton-blok; afmetingen via className (bijv. `h-4 w-full`). */
export function Skeleton({ className, ...rest }: SkeletonProps) {
  return <div className={[baseClass, className].filter(Boolean).join(" ")} {...rest} />;
}

/** Eén of meer tekstregels als placeholder. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={i === lines - 1 ? "h-3 w-4/5" : "h-3 w-full"} />
      ))}
    </div>
  );
}

/** Card-achtig vlak zoals dashboard metric cards. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={[
        "rounded-xl border border-renovation-border bg-renovation-elevated p-4 shadow-renovation-card dark:border-renovation-border",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-2 h-3 w-full max-w-[12rem]" />
    </div>
  );
}

/** Hero + metrics grid zoals dashboard hoofdpagina. */
export function DashboardPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <section className="rounded-2xl border border-renovation-border bg-renovation-elevated p-6 shadow-renovation-card dark:border-renovation-border sm:p-8">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-9 w-full max-w-md" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        <Skeleton className="mt-6 h-16 w-full max-w-lg rounded-xl" />
      </section>
      <div>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-1 h-3 w-56" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["a", "b", "c", "d"].map((k) => (
            <SkeletonCard key={k} />
          ))}
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-xl border border-dashed border-renovation-border dark:border-renovation-border" />
    </div>
  );
}

/** Documentenpagina: titel + kaarten. */
export function DocumentsPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-full max-w-lg" />
      </div>
      <div className="rounded-xl border border-renovation-border p-5 dark:border-renovation-border">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-10 w-full" />
        <Skeleton className="mt-3 h-10 w-full" />
        <Skeleton className="mt-3 h-9 w-32" />
      </div>
      <div className="rounded-xl border border-renovation-border p-5 dark:border-renovation-border">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
      <DocumentsListSkeleton />
    </div>
  );
}

/** Alleen documentenlijst (kaarten). */
export function DocumentsListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-renovation-border bg-renovation-elevated p-4 dark:border-renovation-border dark:bg-renovation-elevated">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5 max-w-xs" />
              <Skeleton className="h-3 w-2/5 max-w-[14rem]" />
              <Skeleton className="h-3 w-1/3 max-w-[10rem]" />
            </div>
            <Skeleton className="h-9 w-28 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Projectenlijst + formulier placeholder. */
export function ProjectsPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-full max-w-lg" />
      </div>
      <div className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 dark:border-renovation-border dark:bg-renovation-elevated">
        <Skeleton className="h-4 w-40" />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-xl border border-renovation-border p-4 dark:border-renovation-border"
          >
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sectie samenwerking op projectdetail. */
export function CollaborationSectionSkeleton() {
  return (
    <section
      className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-sm dark:border-renovation-border dark:bg-renovation-elevated"
      aria-busy="true"
      aria-live="polite"
    >
      <Skeleton className="h-5 w-56 max-w-full" />
      <Skeleton className="mt-2 h-3 w-full max-w-lg" />
      <Skeleton className="mt-4 h-10 w-full max-w-md" />
      <Skeleton className="mt-3 h-9 w-40" />
    </section>
  );
}

/** Projectdetail: titelregel + secties. */
export function ProjectDetailPageSkeleton() {
  return (
    <div className="min-w-0 space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
          <Skeleton className="mt-2 h-3 w-64 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-renovation-border p-5 dark:border-renovation-border">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-4 h-24 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Planning hub: lijst projecten. */
export function PlanningHubSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <ul className="space-y-2">
          {[1, 2, 3].map((i) => (
            <li key={i}>
              <Skeleton className="h-12 w-full max-w-lg rounded-lg" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Enkel-project planningpagina. */
export function PlanningPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div>
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl border border-dashed border-renovation-border dark:border-renovation-border" />
    </div>
  );
}

/** Rapporten: titel + filter + kaartenrij. */
export function ReportsPageSkeleton() {
  return (
    <div className="min-w-0 space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="h-8 w-44" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-10 w-full sm:w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <Skeleton className="h-56 w-full rounded-xl border border-dashed border-renovation-border dark:border-renovation-border" />
    </div>
  );
}
