import { sumEstimatedCostsUnique, taskEstimatedAmount } from "@/lib/dashboard/taskCosts";
import type { ConstructionDepotBalance, Project, ProjectExpense, Task } from "@/lib/renovation/types";

export type DashboardMetrics = {
  totalProjectBudget: number;
  totalEstimatedTaskCosts: number;
  /** Som werkelijke kosten op taken (zonder losse projectuitgaven). */
  totalActualFromTasks: number;
  /** Losse uitgaven op projectniveau (bouwmarkt, enz.). */
  totalLooseExpenses: number;
  /** Taken + losse uitgaven — totaal geregistreerde uitgaven. */
  totalActualRecordedSpend: number;
  budgetGap: number;
  estimateVsActualGap: number;
  totalTasks: number;
  completedTasks: number;
  highPriorityTasks: number;
};

function sumExpenseAmounts(expenses: ProjectExpense[]): number {
  return expenses.reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0);
}

export function computeMetrics(
  projects: Project[],
  tasks: Task[],
  projectExpenses: ProjectExpense[] = []
): DashboardMetrics {
  const totalProjectBudget = projects.reduce((sum, p) => sum + (Number.isFinite(p.totalBudget) ? p.totalBudget : 0), 0);
  const totalEstimatedTaskCosts = sumEstimatedCostsUnique(tasks);
  const totalActualFromTasks = tasks.reduce(
    (sum, t) => sum + (Number.isFinite(t.actualCost) ? t.actualCost : 0),
    0
  );
  const totalLooseExpenses = sumExpenseAmounts(projectExpenses);
  const totalActualRecordedSpend = totalActualFromTasks + totalLooseExpenses;
  const budgetGap = totalProjectBudget - totalEstimatedTaskCosts;
  const estimateVsActualGap = totalEstimatedTaskCosts - totalActualRecordedSpend;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const highPriorityTasks = tasks.filter((t) => t.priority === "high").length;

  return {
    totalProjectBudget,
    totalEstimatedTaskCosts,
    totalActualFromTasks,
    totalLooseExpenses,
    totalActualRecordedSpend,
    budgetGap,
    estimateVsActualGap,
    totalTasks,
    completedTasks,
    highPriorityTasks,
  };
}

export type InsightItem = {
  severity: "warning" | "info";
  /** Pad in locale-JSON, bv. `insights.noProjectBudget` */
  messageKey: string;
  messageParams?: Record<string, string | number>;
};

export function generateInsights(
  projects: Project[],
  tasks: Task[],
  projectExpenses: ProjectExpense[] = [],
  depotBalances: ConstructionDepotBalance[] = []
): InsightItem[] {
  const insights: InsightItem[] = [];

  const totalBudget = projects.reduce((s, p) => s + p.totalBudget, 0);
  const hasAnyProjectWithoutBudget = projects.some((p) => p.totalBudget <= 0);
  const totalEstimated = sumEstimatedCostsUnique(tasks);
  const totalActualTasks = tasks.reduce((s, t) => s + (Number.isFinite(t.actualCost) ? t.actualCost : 0), 0);
  const totalLoose = sumExpenseAmounts(projectExpenses);
  const totalActualAll = totalActualTasks + totalLoose;

  for (const d of depotBalances) {
    if (d.remainingEstimated < 0) {
      insights.push({
        severity: "warning",
        messageKey: "insights.depotOverBudget",
        messageParams: { name: d.name },
      });
    }
  }

  if (tasks.length > 0 && totalActualAll > totalEstimated) {
    insights.push({
      severity: "warning",
      messageKey: "insights.actualExceedsEstimated",
    });
  }

  if (projects.length > 0 && hasAnyProjectWithoutBudget) {
    insights.push({
      severity: "warning",
      messageKey: "insights.noProjectBudget",
    });
  }

  if (totalBudget > 0 && totalEstimated > totalBudget) {
    insights.push({
      severity: "warning",
      messageKey: "insights.estimatedExceedsBudget",
    });
  }

  const missingDuration = tasks.filter((t) => t.durationDays <= 0).length;
  if (missingDuration > 0) {
    insights.push({
      severity: "warning",
      messageKey: "insights.missingDuration",
      messageParams: { count: missingDuration },
    });
  }

  const highTodo = tasks.filter((t) => t.priority === "high" && t.status === "todo").length;
  if (highTodo > 0) {
    insights.push({
      severity: "warning",
      messageKey: "insights.highTodo",
      messageParams: { count: highTodo },
    });
  }

  if (insights.length === 0 && tasks.length > 0) {
    insights.push({
      severity: "info",
      messageKey: "insights.allClear",
    });
  }

  if (tasks.length === 0 && projects.length > 0) {
    insights.push({
      severity: "info",
      messageKey: "insights.addTasksHint",
    });
  }

  return insights;
}
