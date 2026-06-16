"use client";

import Link from "next/link";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/i18n/provider";

export default function WelcomeNoProjectClient() {
  const { t } = useI18n();
  const { isRenovationDataReady } = useRenovation();

  if (!isRenovationDataReady) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div
      data-testid="welcome-no-project"
      className="flex flex-col items-center rounded-2xl border border-dashed border-renovation-border bg-renovation-elevated px-6 py-16 text-center shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated sm:px-12"
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full bg-renovation-muted text-renovation-steel"
        aria-hidden="true"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-7 w-7"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
          />
        </svg>
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
        {t("welcome.noProjectTitle")}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-renovation-concrete">
        {t("welcome.noProjectBody")}
      </p>
      <Link
        href="/dashboard/projects"
        data-testid="welcome-create-first-project"
        className="mt-8 inline-flex items-center justify-center rounded-lg bg-renovation-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-renovation-steel"
      >
        {t("welcome.createFirstProject")}
      </Link>
    </div>
  );
}
