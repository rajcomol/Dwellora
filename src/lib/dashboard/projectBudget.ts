import { taskEstimatedAmount } from "@/lib/dashboard/taskCosts";
import type { Project, Task } from "@/lib/renovation/types";

export type ProjectBudgetBreakdown = {
  ownContribution: number;
  constructionDepotTotal: number;
  totalBudget: number;
  spentDone: number;
  remainingBudget: number;
  depotSpentTotal: number;
  depotRemaining: number;
};

export function projectMoney(project: Project): {
  own: number;
  depot: number;
  total: number;
} {
  const own = Number.isFinite(project.ownContribution) ? project.ownContribution! : 0;
  const depot = Number.isFinite(project.constructionDepotTotal) ? project.constructionDepotTotal! : 0;
  const total =
    Number.isFinite(project.totalBudget) && project.totalBudget > 0
      ? project.totalBudget
      : own + depot;
  return { own, depot, total };
}

export function filterTasksForProjectId(tasks: Task[], projectId: string, roomIds: Set<string>): Task[] {
  return tasks.filter(
    (t) => t.projectId === projectId && (t.roomIds.length === 0 || t.roomIds.some((rid) => roomIds.has(rid)))
  );
}

export function computeProjectBudgetBreakdown(project: Project, tasks: Task[]): ProjectBudgetBreakdown {
  const { own, depot, total } = projectMoney(project);
  const spentDone = tasks
    .filter((t) => t.status === "done")
    .reduce((s, t) => s + taskEstimatedAmount(t), 0);
  const depotSpentTotal = tasks
    .filter((t) => t.constructionDepotId != null)
    .reduce((s, t) => s + taskEstimatedAmount(t), 0);

  return {
    ownContribution: own,
    constructionDepotTotal: depot,
    totalBudget: total,
    spentDone,
    remainingBudget: Math.max(0, total - spentDone),
    depotSpentTotal,
    depotRemaining: Math.max(0, depot - depotSpentTotal),
  };
}

export function daysUntilKeyHandover(dateIso: string | null): number | null {
  if (!dateIso?.trim()) return null;
  const target = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function depotProgressColorClass(percentage: number): string {
  if (percentage >= 90) return "bg-red-500";
  if (percentage >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}
