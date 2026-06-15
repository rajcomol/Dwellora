import type { Project, ProjectConstructionDepotBalance, ProjectExpense, Task } from "@/lib/renovation/types";

export type InsightItem = {
  severity: "warning" | "info";
  /** Pad in locale-JSON, bv. `insights.noProjectBudget` */
  messageKey: string;
  messageParams?: Record<string, string | number>;
};

function sumExpenseAmounts(expenses: ProjectExpense[]): number {
  return expenses.reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0);
}

export function generateInsights(
  projects: Project[],
  tasks: Task[],
  projectExpenses: ProjectExpense[] = [],
  depotBalances: ProjectConstructionDepotBalance[] = [],
  projectNameById: Map<string, string> = new Map()
): InsightItem[] {
  const insights: InsightItem[] = [];

  const totalBudget = projects.reduce((s, p) => s + p.totalBudget, 0);
  const hasAnyProjectWithoutBudget = projects.some((p) => p.totalBudget <= 0);
  const totalSpent = sumExpenseAmounts(projectExpenses);

  for (const d of depotBalances) {
    if (d.remainingAmount < 0) {
      insights.push({
        severity: "warning",
        messageKey: "insights.depotOverBudget",
        messageParams: { name: projectNameById.get(d.projectId) ?? "—" },
      });
    }
  }

  if (totalBudget > 0 && totalSpent > totalBudget) {
    insights.push({
      severity: "warning",
      messageKey: "insights.spentExceedsBudget",
    });
  }

  if (projects.length > 0 && hasAnyProjectWithoutBudget) {
    insights.push({
      severity: "warning",
      messageKey: "insights.noProjectBudget",
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
