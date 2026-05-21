"use client";

import { useMemo } from "react";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import {
  computeProjectBudgetBreakdown,
  daysUntilKeyHandover,
  filterTasksForProjectId,
} from "@/lib/dashboard/projectBudget";
import { formatCurrency } from "@/lib/format/currency";
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import type { Project, Task } from "@/lib/renovation/types";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-renovation-border bg-renovation-elevated p-4 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated">
      <div className="text-xs font-medium text-renovation-concrete">{label}</div>
      <div className="mt-2 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{value}</div>
      {hint ? <div className="mt-1 text-xs text-renovation-concrete">{hint}</div> : null}
    </div>
  );
}

function statsForProject(project: Project, tasks: Task[], roomIds: Set<string>, t: (k: string, p?: Record<string, string | number>) => string) {
  const filtered = filterTasksForProjectId(tasks, project.id, roomIds);
  const breakdown = computeProjectBudgetBreakdown(project, filtered);
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
    budget: formatCurrency(breakdown.remainingBudget),
    depot: formatCurrency(breakdown.depotRemaining),
    key: keyLabel,
    keyHint,
  };
}

export default function DashboardStatGrid() {
  const { t } = useI18n();
  const { selectedProject } = useSelectedProject();
  const { projects, rooms, tasks } = useRenovation();

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
      return statsForProject(selectedProject, tasks, roomIds, t);
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
    return statsForProject(first, tasks, roomIds, t);
  }, [selectedProject, projects, tasks, roomIdsByProject, t]);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label={t("dashboard.stats.tasks")} value={display.tasks} />
      <StatCard label={t("dashboard.stats.budgetRemaining")} value={display.budget} />
      <StatCard label={t("dashboard.stats.depotRemaining")} value={display.depot} />
      <StatCard label={t("dashboard.stats.keyDate")} value={display.key} hint={display.keyHint} />
    </div>
  );
}
