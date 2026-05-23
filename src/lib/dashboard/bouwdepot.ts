import { projectMoney } from "@/lib/dashboard/projectBudget";
import type { Project, ProjectConstructionDepotBalance, ProjectExpense, Task } from "@/lib/renovation/types";

/** Bedrag dat een taak tegen het bouwdepot telt: werkelijk indien ingevuld, anders geschat. */
export function taskBouwdepotChargeAmount(task: Task): number {
  if (!task.fundedByConstructionDepot) return 0;
  if (Number.isFinite(task.actualCost) && task.actualCost > 0) return task.actualCost;
  return task.estimatedCost != null && Number.isFinite(task.estimatedCost) ? task.estimatedCost : 0;
}

export function computeProjectBouwdepotBalance(
  project: Project,
  tasks: Task[],
  expenses: ProjectExpense[] = []
): ProjectConstructionDepotBalance {
  const totalAmount = projectMoney(project).depot;
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const linked = projectTasks.filter((t) => t.fundedByConstructionDepot);
  const taskUsed = linked.reduce((sum, t) => sum + taskBouwdepotChargeAmount(t), 0);
  const expenseUsed = expenses
    .filter((e) => e.projectId === project.id && e.fundedByConstructionDepot)
    .reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0);
  const usedAmount = taskUsed + expenseUsed;
  const percentageUsed = totalAmount > 0 ? (usedAmount / totalAmount) * 100 : 0;

  return {
    projectId: project.id,
    totalAmount,
    usedAmount,
    remainingAmount: totalAmount - usedAmount,
    percentageUsed,
    linkedTaskCount: linked.length,
  };
}

export function computeBouwdepotBalancesForProjects(
  projects: Project[],
  tasks: Task[],
  expenses: ProjectExpense[] = []
): ProjectConstructionDepotBalance[] {
  return projects.map((project) => {
    const projectTasks = tasks.filter((t) => t.projectId === project.id);
    return computeProjectBouwdepotBalance(project, projectTasks, expenses);
  });
}
