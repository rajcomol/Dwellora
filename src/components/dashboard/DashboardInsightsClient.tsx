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
    () =>
      generateInsights(
        projects ?? [],
        tasks ?? [],
        projectExpenses ?? [],
        constructionDepotBalances ?? []
      ),
    [projects, tasks, projectExpenses, constructionDepotBalances]
  );
  const upcoming = useMemo(
    () => getUpcomingTasks(projects ?? [], rooms ?? [], tasks ?? [], 10),
    [projects, rooms, tasks]
  );

  const nextUp = upcoming[0];

  if (!isRenovationDataReady) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section
        data-tour="dashboard-hero"
        className="motion-safe-fade-in rounded-2xl border border-renovation-border bg-renovation-elevated p-6 shadow-renovation-card outline-none dark:border dark:border-renovation-border dark:bg-renovation-elevated sm:p-8"
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-renovation-steel">
            {t("dashboard.heroEyebrow")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {t("dashboard.heroTitle")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-renovation-concrete">
            {t("dashboard.heroSubtitle")}
          </p>
          {nextUp ? (
            <div className="mt-6 rounded-xl border border-renovation-border/80 bg-renovation-surface/80 px-4 py-3 dark:border-renovation-border dark:bg-renovation-muted/30">
              <p className="text-xs text-renovation-concrete">{t("dashboard.nextUp")}</p>
              <p className="mt-1 font-medium text-foreground">{nextUp.title}</p>
              <p className="mt-0.5 text-xs text-renovation-concrete">
                {nextUp.projectName} → {nextUp.roomName} •{" "}
                {t("dashboard.nextUpPriority", { priority: t(`task.priority.${nextUp.priority}`) })}
              </p>
            </div>
          ) : (
            <p className="mt-6 text-sm leading-relaxed text-renovation-concrete">{t("dashboard.noOpenTasksHero")}</p>
          )}
        </div>
      </section>

      <section data-tour="dashboard-stats">
        <h2 className="text-base font-semibold text-foreground">{t("dashboard.keyMetrics")}</h2>
        <div className="mt-4">
          <DashboardStatGrid />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <BudgetBreakdownCard />
        <BouwdepotDashboardCard />
      </div>

      <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated">
        <h2 className="text-base font-semibold text-foreground">{t("dashboard.upcomingTitle")}</h2>
        <p className="mt-1 text-xs text-renovation-concrete">{t("dashboard.upcomingHint")}</p>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-renovation-concrete">{t("dashboard.noOpenTasks")}</p>
        ) : (
          <ul className="mt-4 overflow-hidden rounded-xl bg-renovation-surface dark:bg-renovation-elevated">
            {upcoming.map((u, index) => (
              <li
                key={u.id}
                className={[
                  "flex flex-col gap-0.5 px-3 py-2.5 text-sm",
                  index < upcoming.length - 1
                    ? "border-b border-transparent dark:border-b dark:border-renovation-border"
                    : "",
                ].join(" ")}
              >
                <div className="font-medium text-foreground">{u.title}</div>
                <div className="text-xs text-renovation-concrete dark:text-renovation-concrete">
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
            className="text-sm font-medium text-renovation-steel underline decoration-renovation-accent/50 underline-offset-2 hover:decoration-renovation-accent"
          >
            {t("nav.tabs.planning")}
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated">
        <h2 className="text-base font-semibold text-foreground">{t("dashboard.insightsTitle")}</h2>
        <p className="mt-1 text-xs text-renovation-concrete">{t("dashboard.insightsHint")}</p>
        {insights.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-renovation-concrete">{t("dashboard.insightsEmpty")}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {insights.map((item, i) => (
              <li
                key={i}
                className={[
                  "rounded-lg border px-3 py-2 text-sm",
                  item.severity === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
                    : "border-renovation-border bg-renovation-surface text-foreground",
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
