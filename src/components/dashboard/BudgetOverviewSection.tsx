"use client";

import { useMemo } from "react";
import BouwdepotDeclaratieCard from "@/components/dashboard/BouwdepotDeclaratieCard";
import BudgetSourceCard from "@/components/dashboard/BudgetSourceCard";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import { computeDeclaratieTotals } from "@/lib/dashboard/bouwdepotDeclaraties";
import {
  computeProjectSpendOverview,
  filterTasksForProjectId,
  projectMoney,
} from "@/lib/dashboard/projectBudget";
import { formatCurrency } from "@/lib/format/currency";

export default function BudgetOverviewSection() {
  const { t } = useI18n();
  const { selectedProject, selectedProjectId } = useSelectedProject();
  const { projects, rooms, tasks, projectExpenses, declaraties } = useRenovation();

  const project = selectedProject ?? projects[0] ?? null;
  const projectId = selectedProjectId ?? project?.id ?? null;

  const overview = useMemo(() => {
    if (!project) return null;
    const roomIds = new Set(rooms.filter((r) => r.projectId === project.id).map((r) => r.id));
    const filteredTasks = filterTasksForProjectId(tasks, project.id, roomIds);
    const expenses = projectExpenses.filter((e) => e.projectId === project.id);
    return computeProjectSpendOverview(project, filteredTasks, expenses);
  }, [project, rooms, tasks, projectExpenses]);

  const declaratieOverview = useMemo(() => {
    if (!project) return null;
    const depotTotal = projectMoney(project).depot;
    const totals = computeDeclaratieTotals(declaraties ?? [], project.id);
    const declared = totals.totaalUitbetaald;
    const remaining = depotTotal - declared;
    const declaredPct = depotTotal > 0 ? (declared / depotTotal) * 100 : 0;
    return { depotTotal, declared, remaining, declaredPct };
  }, [project, declaraties]);

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
  const declaratiesHref = projectId ? `/dashboard/projects/${projectId}/settings` : null;

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

      <BouwdepotDeclaratieCard
        total={declaratieOverview?.depotTotal ?? 0}
        declared={declaratieOverview?.declared ?? 0}
        remaining={declaratieOverview?.remaining ?? 0}
        declaredPct={declaratieOverview?.declaredPct ?? 0}
        manageHref={declaratiesHref}
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
