"use client";

import { useMemo } from "react";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import { computeBouwdepotUsage } from "@/lib/dashboard/bouwdepot";
import {
  computeProjectSpendOverview,
  daysUntilKeyHandover,
} from "@/lib/dashboard/projectBudget";
import { formatCurrency } from "@/lib/format/currency";
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import type { Project, ProjectExpense, Task } from "@/lib/renovation/types";

function StatCard({
  label,
  value,
  hint,
  testId,
}: {
  label: string;
  value: string;
  hint?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="rounded-xl bg-renovation-surface p-4 dark:border dark:border-renovation-border dark:bg-renovation-elevated"
    >
      <div className="text-xs text-renovation-concrete">{label}</div>
      <div className="mt-2 font-semibold tabular-nums text-foreground">{value}</div>
      {hint ? <div className="mt-1 text-xs text-renovation-concrete">{hint}</div> : null}
    </div>
  );
}

function statsForProject(
  project: Project,
  tasks: Task[],
  expenses: ProjectExpense[],
  t: (k: string, p?: Record<string, string | number>) => string
) {
  const projectExpenses = expenses.filter((e) => e.projectId === project.id);
  const overview = computeProjectSpendOverview(project, projectExpenses);
  const depotUsage = computeBouwdepotUsage(project, projectExpenses);
  const depotRemaining = depotUsage.remainingAmount;
  const projectTasks = tasks.filter((tk) => tk.projectId === project.id);
  const total = projectTasks.length;
  const done = projectTasks.filter((tk) => tk.status === "done").length;
  const days = daysUntilKeyHandover(project.expectedKeyHandover);
  const keyLabel = project.expectedKeyHandover
    ? formatDisplayDate(project.expectedKeyHandover)
    : t("dashboard.stats.noKeyDate");
  const keyHint =
    days == null
      ? undefined
      : days >= 0
        ? t("dashboard.stats.daysUntilKey", { days })
        : t("dashboard.stats.daysPastKey", { days: Math.abs(days) });

  return {
    tasks: t("dashboard.stats.tasksValue", { done, total }),
    budget: formatCurrency(overview.remainingBudget),
    depot: formatCurrency(depotRemaining),
    key: keyLabel,
    keyHint,
  };
}

export default function DashboardStatGrid() {
  const { t } = useI18n();
  const { selectedProject } = useSelectedProject();
  const { projects, tasks, projectExpenses } = useRenovation();

  const display = useMemo(() => {
    if (selectedProject) {
      return statsForProject(selectedProject, tasks, projectExpenses, t);
    }
    if (projects.length === 0) {
      return {
        tasks: "—",
        budget: "—",
        depot: "—",
        key: "—",
        keyHint: undefined as string | undefined,
      };
    }
    const first = projects[0]!;
    return statsForProject(first, tasks, projectExpenses, t);
  }, [selectedProject, projects, tasks, projectExpenses, t]);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label={t("dashboard.stats.tasks")} value={display.tasks} />
      <StatCard
        label={t("dashboard.stats.budgetRemaining")}
        value={display.budget}
        testId="budget-remaining-stat"
      />
      <StatCard label={t("dashboard.stats.depotRemaining")} value={display.depot} />
      <StatCard
        label={t("dashboard.stats.keyDate")}
        value={display.key}
        hint={display.keyHint}
        testId="dashboard-key-date-stat"
      />
    </div>
  );
}
