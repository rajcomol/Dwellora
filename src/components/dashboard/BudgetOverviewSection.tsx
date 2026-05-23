"use client";

import { useMemo } from "react";
import BudgetSourceCard from "@/components/dashboard/BudgetSourceCard";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import {
  computeProjectSpendOverview,
  filterTasksForProjectId,
} from "@/lib/dashboard/projectBudget";
import { formatCurrency } from "@/lib/format/currency";
import { appendProjectQuery } from "@/components/layout/tab-nav-config";

export default function BudgetOverviewSection() {
  const { t } = useI18n();
  const { selectedProject, selectedProjectId } = useSelectedProject();
  const { projects, rooms, tasks, projectExpenses } = useRenovation();

  const project = selectedProject ?? projects[0] ?? null;
  const projectId = selectedProjectId ?? project?.id ?? null;

  const overview = useMemo(() => {
    if (!project) return null;
    const roomIds = new Set(rooms.filter((r) => r.projectId === project.id).map((r) => r.id));
    const filteredTasks = filterTasksForProjectId(tasks, project.id, roomIds);
    const expenses = projectExpenses.filter((e) => e.projectId === project.id);
    return computeProjectSpendOverview(project, filteredTasks, expenses);
  }, [project, rooms, tasks, projectExpenses]);

  if (!project || !overview) {
    return (
      <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated">
        <p className="text-sm text-renovation-concrete">{t("layout.topBar.chooseProject")}</p>
      </section>
    );
  }

  const hasBudget = overview.totalBudget > 0 || overview.ownTotal > 0 || overview.depotTotal > 0;
  if (!hasBudget) {
    return (
      <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated">
        <p className="text-sm leading-relaxed text-renovation-concrete">{t("budget.breakdownEmpty")}</p>
      </section>
    );
  }

  const financesHref = projectId ? `/dashboard/projects/${projectId}/finances` : null;
  const bouwdepotHref = projectId ? appendProjectQuery("/dashboard/bouwdepot", projectId) : null;

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <BudgetSourceCard
        title={t("budget.ownMoney")}
        total={overview.ownTotal}
        used={overview.ownUsed}
        remaining={overview.ownRemaining}
        usedPct={overview.ownUsedPct}
        manageHref={financesHref}
        emptyHint={t("dashboard.budget.noOwnWarning")}
      />

      <BudgetSourceCard
        title={t("bouwdepot.cardTitle")}
        total={overview.depotTotal}
        used={overview.depotUsed}
        remaining={overview.depotRemaining}
        usedPct={overview.depotUsedPct}
        manageHref={bouwdepotHref}
        emptyHint={t("bouwdepot.noProjectTotalWarning")}
      />

      <article
        data-testid="budget-total-spent"
        className="flex flex-col rounded-xl border border-renovation-border bg-renovation-muted/50 p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-muted/30"
      >
        <h3 className="text-sm font-semibold text-foreground">{t("dashboard.budget.totalSpent")}</h3>
        <p
          data-testid="budget-total-spent-amount"
          className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground"
        >
          {formatCurrency(overview.totalSpent)}
        </p>
        <p className="mt-1 text-xs text-renovation-concrete">
          {t("dashboard.budget.spentOfEstimated", {
            amount: formatCurrency(overview.estimatedTasksTotal),
          })}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-renovation-muted">
          <div
            className="h-full rounded-full bg-renovation-accent transition-all"
            style={{ width: `${overview.spentVsBudgetPct}%` }}
          />
        </div>
      </article>
    </section>
  );
}
