import { taskBouwdepotChargeAmount } from "@/lib/dashboard/bouwdepot";
import { sumEstimatedCostsUnique, taskChargeAmount, taskEstimatedAmount } from "@/lib/dashboard/taskCosts";
import type { Project, ProjectExpense, Task } from "@/lib/renovation/types";

/** Losse projectuitgaven voor budget (niet gekoppeld aan een taak; voorkomt dubbeltelling). */
export function looseExpensesForBudget(expenses: ProjectExpense[], _tasks?: Task[]): ProjectExpense[] {
  return expenses.filter((e) => !e.taskId);
}

/** Bedrag dat een taak tegen eigen geld telt (niet uit bouwdepot). */
export function taskOwnMoneyChargeAmount(task: Task): number {
  if (task.fundedByConstructionDepot) return 0;
  return taskChargeAmount(task);
}

function sumOwnMoneyExpenseUsed(expenses: ProjectExpense[]): number {
  return expenses
    .filter((e) => !e.fundedByConstructionDepot)
    .reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0);
}

function sumExpenseAmounts(expenses: ProjectExpense[]): number {
  return expenses.reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0);
}

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
  const depotSpentTotal = tasks.reduce((s, t) => s + taskBouwdepotChargeAmount(t), 0);

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
  estimatedTasksTotal: number;
  spentVsBudgetPct: number;
};

export function computeProjectSpendOverview(
  project: Project,
  tasks: Task[],
  expenses: ProjectExpense[] = []
): ProjectSpendOverview {
  const { own, depot, total } = projectMoney(project);
  const projectExpenses = expenses.filter((e) => e.projectId === project.id);
  const budgetExpenses = looseExpensesForBudget(projectExpenses, tasks);
  const taskSpent = tasks.reduce((s, t) => s + taskChargeAmount(t), 0);
  const looseSpent = sumExpenseAmounts(budgetExpenses);
  const totalSpent = taskSpent + looseSpent;
  const estimatedTasksTotal = sumEstimatedCostsUnique(tasks);
  const ownTaskUsed = tasks.reduce((s, t) => s + taskOwnMoneyChargeAmount(t), 0);
  const ownExpenseUsed = sumOwnMoneyExpenseUsed(budgetExpenses);
  const ownUsedTotal = ownTaskUsed + ownExpenseUsed;
  const ownRemaining = own - ownUsedTotal;

  const depotTaskUsed = tasks.reduce((s, t) => s + taskBouwdepotChargeAmount(t), 0);
  const depotExpenseUsed = budgetExpenses
    .filter((e) => e.fundedByConstructionDepot)
    .reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0);
  const depotUsedTotal = depotTaskUsed + depotExpenseUsed;
  const depotRemaining = depot - depotUsedTotal;

  return {
    ownTotal: own,
    ownUsed: ownUsedTotal,
    ownRemaining,
    ownUsedPct: own > 0 ? Math.min(100, (ownUsedTotal / own) * 100) : 0,
    depotTotal: depot,
    depotUsed: depotUsedTotal,
    depotRemaining,
    depotUsedPct: depot > 0 ? Math.min(100, (depotUsedTotal / depot) * 100) : 0,
    totalBudget: total,
    totalSpent,
    estimatedTasksTotal,
    spentVsBudgetPct: total > 0 ? Math.min(100, (totalSpent / total) * 100) : 0,
  };
}
