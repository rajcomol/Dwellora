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
  depotExpenses: number;
  depotTasks: number;
};

/**
 * Gebruikt bouwdepot = uitbetaalde declaraties + depot-uitgaven + depot-taken.
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

  const uitbetaaldDeclaraties = computeDeclaratieTotals(declaraties, projectId).totaalUitbetaald;

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

  const usedAmount = uitbetaaldDeclaraties + depotExpenses + depotTasks;
  const remainingAmount = totalAmount - usedAmount;
  const percentageUsed = totalAmount > 0 ? Math.min(100, (usedAmount / totalAmount) * 100) : 0;

  return {
    totalAmount,
    usedAmount,
    remainingAmount,
    percentageUsed,
    uitbetaaldDeclaraties,
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
