import type { Task } from "@/lib/renovation/types";

export function taskEstimatedAmount(task: Task): number {
  return task.estimatedCost != null && Number.isFinite(task.estimatedCost) ? task.estimatedCost : 0;
}

/** Sum estimated costs once per task (for project-level totals). */
export function sumEstimatedCostsUnique(tasks: Task[]): number {
  const seen = new Set<string>();
  let sum = 0;
  for (const t of tasks) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    sum += taskEstimatedAmount(t);
  }
  return sum;
}

/** Sum estimated costs for tasks shown in a single room (full amount per task in that room). */
export function sumEstimatedCostsForRoom(tasks: Task[]): number {
  return tasks.reduce((s, t) => s + taskEstimatedAmount(t), 0);
}

export function formatEstimatedCostDisplay(
  cost: number | null,
  formatCurrency: (n: number) => string,
  noEstimateLabel: string
): string {
  if (cost == null || !Number.isFinite(cost)) return noEstimateLabel;
  return formatCurrency(cost);
}
