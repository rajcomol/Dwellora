import { computeDeclaratieTotals } from "@/lib/dashboard/bouwdepotDeclaraties";
import { projectMoney } from "@/lib/dashboard/projectBudget";
import type {
  BouwdepotDeclaratie,
  Project,
  ProjectConstructionDepotBalance,
  ProjectExpense,
  Task,
} from "@/lib/renovation/types";

/** Bedrag dat een taak tegen het bouwdepot telt: werkelijk indien ingevuld, anders geschat. */
export function taskBouwdepotChargeAmount(task: Task): number {
  if (!task.fundedByConstructionDepot) return 0;
  if (Number.isFinite(task.actualCost) && task.actualCost > 0) return task.actualCost;
  return task.estimatedCost != null && Number.isFinite(task.estimatedCost) ? task.estimatedCost : 0;
}

export type BouwdepotUsageBreakdown = {
  totalAmount: number;
  usedAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  uitbetaaldDeclaraties: number;
  ingediendDeclaraties: number;
  depotExpenses: number;
  depotTasks: number;
};

/** Kleur voor resterend bouwdepot-saldo t.o.v. totaal. */
export function bouwdepotRemainingAmountClass(remaining: number, total: number): string {
  if (total <= 0) return "text-foreground";
  const pct = (remaining / total) * 100;
  if (pct < 10) return "text-red-600 dark:text-red-400";
  if (pct <= 25) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

/**
 * Gebruikt bouwdepot = uitbetaalde + ingediende declaraties + depot-uitgaven + depot-taken.
 * Taken met een uitbetaalde declaratie (zelfde taak_id) tellen alleen via de declaratie mee.
 */
export function computeBouwdepotUsage(
  project: Project,
  tasks: Task[],
  expenses: ProjectExpense[],
  declaraties: BouwdepotDeclaratie[] = []
): BouwdepotUsageBreakdown {
  const projectId = project.id;
  const totalAmount = projectMoney(project).depot;

  const declTotals = computeDeclaratieTotals(declaraties, projectId);
  const uitbetaaldDeclaraties = declTotals.totaalUitbetaald;
  const ingediendDeclaraties = declTotals.totaalIngediend;

  const paidTaskIds = new Set(
    declaraties
      .filter((d) => d.projectId === projectId && d.status === "uitbetaald" && d.taakId)
      .map((d) => d.taakId as string)
  );

  const depotTasks = tasks
    .filter((t) => t.projectId === projectId && t.fundedByConstructionDepot && !paidTaskIds.has(t.id))
    .reduce((s, t) => s + taskBouwdepotChargeAmount(t), 0);

  const depotExpenses = expenses
    .filter((e) => e.projectId === projectId && e.fundedByConstructionDepot)
    .reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0);

  const usedAmount = uitbetaaldDeclaraties + ingediendDeclaraties + depotExpenses + depotTasks;
  const remainingAmount = totalAmount - usedAmount;
  const percentageUsed = totalAmount > 0 ? Math.min(100, (usedAmount / totalAmount) * 100) : 0;

  return {
    totalAmount,
    usedAmount,
    remainingAmount,
    percentageUsed,
    uitbetaaldDeclaraties,
    ingediendDeclaraties,
    depotExpenses,
    depotTasks,
  };
}

export function computeProjectBouwdepotBalance(
  project: Project,
  tasks: Task[],
  expenses: ProjectExpense[] = [],
  declaraties: BouwdepotDeclaratie[] = []
): ProjectConstructionDepotBalance {
  const usage = computeBouwdepotUsage(project, tasks, expenses, declaraties);
  const linked = tasks.filter((t) => t.projectId === project.id && t.fundedByConstructionDepot);

  return {
    projectId: project.id,
    totalAmount: usage.totalAmount,
    usedAmount: usage.usedAmount,
    remainingAmount: usage.remainingAmount,
    percentageUsed: usage.percentageUsed,
    linkedTaskCount: linked.length,
  };
}

export function computeBouwdepotBalancesForProjects(
  projects: Project[],
  tasks: Task[],
  expenses: ProjectExpense[] = [],
  declaraties: BouwdepotDeclaratie[] = []
): ProjectConstructionDepotBalance[] {
  return projects.map((project) => {
    const projectTasks = tasks.filter((t) => t.projectId === project.id);
    return computeProjectBouwdepotBalance(project, projectTasks, expenses, declaraties);
  });
}
