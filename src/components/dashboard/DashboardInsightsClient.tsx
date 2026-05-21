"use client";

import Link from "next/link";
import { useMemo } from "react";
import BouwdepotDashboardCard from "@/components/dashboard/BouwdepotDashboardCard";
import BudgetBreakdownCard from "@/components/dashboard/BudgetBreakdownCard";
import DashboardStatGrid from "@/components/dashboard/DashboardStatGrid";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/i18n/provider";
import { generateInsights } from "@/lib/dashboard/insights";
import { getUpcomingTasks } from "@/lib/dashboard/upcomingTasks";
import { formatDisplayDate } from "@/lib/format/dateDisplay";

export default function DashboardInsightsClient() {
  const { t } = useI18n();
  const { projects, rooms, tasks, projectExpenses, constructionDepotBalances, isRenovationDataReady } =
    useRenovation();

  const insights = useMemo(
    () => generateInsights(projects, tasks, projectExpenses, constructionDepotBalances),
    [projects, tasks, projectExpenses, constructionDepotBalances]
  );
  const upcoming = useMemo(() => getUpcomingTasks(projects, rooms, tasks, 10), [projects, rooms, tasks]);

  const nextUp = upcoming[0];

  if (!isRenovationDataReady) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section
        data-tour="dashboard-hero"
        className="motion-safe-fade-in relative overflow-hidden rounded-2xl border border-renovation-border bg-renovation-elevated p-6 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated sm:p-8"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-renovation-accent/15 blur-3xl dark:bg-renovation-accent/10"
          aria-hidden
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-renovation-steel dark:text-renovation-accent">
            {t("dashboard.heroEyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            {t("dashboard.heroTitle")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-renovation-concrete">{t("dashboard.heroSubtitle")}</p>
          {nextUp ? (
            <div className="mt-6 rounded-xl border border-renovation-border/80 bg-renovation-surface/80 px-4 py-3 dark:border-renovation-border dark:bg-renovation-muted/30">
              <p className="text-xs font-medium text-renovation-concrete">{t("dashboard.nextUp")}</p>
              <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{nextUp.title}</p>
              <p className="mt-0.5 text-xs text-renovation-concrete">
                {nextUp.projectName} → {nextUp.roomName} •{" "}
                {t("dashboard.nextUpPriority", { priority: t(`task.priority.${nextUp.priority}`) })}
              </p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-renovation-concrete">{t("dashboard.noOpenTasksHero")}</p>
          )}
        </div>
      </section>

      <section data-tour="dashboard-stats">
        <h2 className="text-sm font-semibold text-renovation-steel dark:text-zinc-200">{t("dashboard.keyMetrics")}</h2>
        <div className="mt-4">
          <DashboardStatGrid />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BudgetBreakdownCard />
        <BouwdepotDashboardCard />
      </div>

      <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{t("dashboard.upcomingTitle")}</h2>
        <p className="mt-1 text-xs text-renovation-concrete">{t("dashboard.upcomingHint")}</p>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-renovation-concrete">{t("dashboard.noOpenTasks")}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {upcoming.map((u) => (
              <li
                key={u.id}
                className="flex flex-col gap-0.5 rounded-lg border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border"
              >
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{u.title}</div>
                <div className="text-xs text-renovation-concrete">
                  {u.projectName} → {u.roomName} • {t(`task.priority.${u.priority}`)} • {t(`task.status.${u.status}`)}
                  {u.startDate ? ` • ${formatDisplayDate(u.startDate)}` : ""}
                  {u.durationDays > 0 ? ` • ${u.durationDays}d` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <Link
            href="/dashboard/planning"
            className="text-sm font-medium text-renovation-steel underline decoration-renovation-accent/50 underline-offset-2 hover:decoration-renovation-accent dark:text-renovation-accent"
          >
            {t("nav.tabs.planning")}
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{t("dashboard.insightsTitle")}</h2>
        <p className="mt-1 text-xs text-renovation-concrete">{t("dashboard.insightsHint")}</p>
        {insights.length === 0 ? (
          <p className="mt-3 text-sm text-renovation-concrete">{t("dashboard.insightsEmpty")}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {insights.map((item, i) => (
              <li
                key={i}
                className={[
                  "rounded-lg border px-3 py-2 text-sm",
                  item.severity === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
                    : "border-renovation-border bg-renovation-surface text-zinc-800 dark:border-renovation-border dark:bg-zinc-900/40 dark:text-zinc-200",
                ].join(" ")}
              >
                {t(item.messageKey, item.messageParams)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
