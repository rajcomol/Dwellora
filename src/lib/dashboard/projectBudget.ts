import { computeBouwdepotUsage } from "@/lib/dashboard/bouwdepot";
import type { Project, ProjectExpense, Task } from "@/lib/renovation/types";

/** Losse projectuitgaven (niet gekoppeld aan een taak). */
export function looseExpensesForBudget(expenses: ProjectExpense[]): ProjectExpense[] {
  return expenses.filter((e) => !e.taskId);
}

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

export type ProjectSpendOverview = {
  ownTotal: number;
  ownUsed: number;
  ownRemaining: number;
  ownUsedPct: number;
  depotTotal: number;
  depotUsed: number;
  depotRemaining: number;
  depotUsedPct: number;
  totalBudget: number;
  totalSpent: number;
  /** Totaal budget minus som van alle kostenposten. */
  remainingBudget: number;
  spentVsBudgetPct: number;
};

export function computeProjectSpendOverview(
  project: Project,
  expenses: ProjectExpense[] = []
): ProjectSpendOverview {
  const { own, depot, total } = projectMoney(project);
  const projectExpenses = expenses.filter((e) => e.projectId === project.id);
  const totalSpent = projectExpenses.reduce(
    (s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0),
    0
  );
  const ownExpenseUsed = projectExpenses
    .filter((e) => !e.fundedByConstructionDepot)
    .reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0);
  const ownRemaining = own - ownExpenseUsed;

  const depotUsage = computeBouwdepotUsage(project, projectExpenses);

  return {
    ownTotal: own,
    ownUsed: ownExpenseUsed,
    ownRemaining,
    ownUsedPct: own > 0 ? Math.min(100, (ownExpenseUsed / own) * 100) : 0,
    depotTotal: depot,
    depotUsed: depotUsage.usedAmount,
    depotRemaining: depotUsage.remainingAmount,
    depotUsedPct: depotUsage.percentageUsed,
    totalBudget: total,
    totalSpent,
    remainingBudget: total - totalSpent,
    spentVsBudgetPct: total > 0 ? Math.min(100, (totalSpent / total) * 100) : 0,
  };
}
