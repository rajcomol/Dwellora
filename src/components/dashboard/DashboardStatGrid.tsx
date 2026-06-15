"use client";

import { useMemo } from "react";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import { computeBouwdepotUsage } from "@/lib/dashboard/bouwdepot";
import {
  computeProjectSpendOverview,
  daysUntilKeyHandover,
  filterTasksForProjectId,
} from "@/lib/dashboard/projectBudget";
import { formatCurrency } from "@/lib/format/currency";
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import type { BouwdepotDeclaratie, Project, ProjectExpense, Task } from "@/lib/renovation/types";

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
  declaraties: BouwdepotDeclaratie[],
  roomIds: Set<string>,
  t: (k: string, p?: Record<string, string | number>) => string
) {
  const filtered = filterTasksForProjectId(tasks, project.id, roomIds);
  const overview = computeProjectSpendOverview(project, filtered, expenses);
  const depotUsage = computeBouwdepotUsage(project, expenses);
  const depotRemaining = depotUsage.remainingAmount;
  const total = filtered.length;
  const done = filtered.filter((tk) => tk.status === "done").length;
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
  const { projects, rooms, tasks, projectExpenses, declaraties } = useRenovation();

  const roomIdsByProject = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of rooms) {
      const set = map.get(r.projectId) ?? new Set();
      set.add(r.id);
      map.set(r.projectId, set);
    }
    return map;
  }, [rooms]);

  const display = useMemo(() => {
    if (selectedProject) {
      const roomIds = roomIdsByProject.get(selectedProject.id) ?? new Set();
      return statsForProject(selectedProject, tasks, projectExpenses, declaraties ?? [], roomIds, t);
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
    const roomIds = roomIdsByProject.get(first.id) ?? new Set();
    return statsForProject(first, tasks, projectExpenses, declaraties ?? [], roomIds, t);
  }, [selectedProject, projects, tasks, projectExpenses, declaraties, roomIdsByProject, t]);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label={t("dashboard.stats.tasks")} value={display.tasks} />
      <StatCard
        label={t("dashboard.stats.budgetRemaining")}
        value={display.budget}
        testId="budget-remaining-stat"
      />
      <StatCard label={t("dashboard.stats.depotRemaining")} value={display.depot} />
      <StatCard label={t("dashboard.stats.keyDate")} value={display.key} hint={display.keyHint} />
    </div>
  );
}
