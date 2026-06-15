import { projectMoney } from "@/lib/dashboard/projectBudget";
import type {
  Project,
  ProjectConstructionDepotBalance,
  ProjectExpense,
  Task,
} from "@/lib/renovation/types";

/** @deprecated Taken tellen niet meer mee voor bouwdepot. */
export function taskBouwdepotChargeAmount(_task: Task): number {
  return 0;
}

export type BouwdepotUsageBreakdown = {
  totalAmount: number;
  usedAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  ingediend: number;
  uitbetaald: number;
};

/** Kleur voor resterend bouwdepot-saldo t.o.v. totaal. */
export function bouwdepotRemainingAmountClass(remaining: number, total: number): string {
  if (total <= 0) return "text-foreground";
  const pct = (remaining / total) * 100;
  if (pct < 10) return "text-red-600 dark:text-red-400";
  if (pct <= 25) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

function depotExpensesForProject(projectId: string, expenses: ProjectExpense[]): ProjectExpense[] {
  return expenses.filter((e) => e.projectId === projectId && e.fundedByConstructionDepot);
}

function sumAmounts(items: ProjectExpense[]): number {
  return items.reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0);
}

/** Bouwdepot-gebruik puur uit kostenposten met fundedByConstructionDepot. */
export function computeBouwdepotUsage(project: Project, expenses: ProjectExpense[]): BouwdepotUsageBreakdown {
  const totalAmount = projectMoney(project).depot;
  const depotItems = depotExpensesForProject(project.id, expenses);
  const usedAmount = sumAmounts(depotItems);
  const ingediend = sumAmounts(depotItems.filter((e) => e.bouwdepotStatus === "ingediend"));
  const uitbetaald = sumAmounts(depotItems.filter((e) => e.bouwdepotStatus === "uitbetaald"));
  const remainingAmount = totalAmount - usedAmount;
  const percentageUsed = totalAmount > 0 ? Math.min(100, (usedAmount / totalAmount) * 100) : 0;

  return {
    totalAmount,
    usedAmount,
    remainingAmount,
    percentageUsed,
    ingediend,
    uitbetaald,
  };
}

export function computeProjectBouwdepotBalance(
  project: Project,
  _tasks: Task[],
  expenses: ProjectExpense[] = []
): ProjectConstructionDepotBalance {
  const usage = computeBouwdepotUsage(project, expenses);
  const linkedCount = depotExpensesForProject(project.id, expenses).length;

  return {
    projectId: project.id,
    totalAmount: usage.totalAmount,
    usedAmount: usage.usedAmount,
    remainingAmount: usage.remainingAmount,
    percentageUsed: usage.percentageUsed,
    linkedTaskCount: linkedCount,
  };
}

export function computeBouwdepotBalancesForProjects(
  projects: Project[],
  _tasks: Task[],
  expenses: ProjectExpense[] = []
): ProjectConstructionDepotBalance[] {
  return projects.map((project) => computeProjectBouwdepotBalance(project, [], expenses));
}
