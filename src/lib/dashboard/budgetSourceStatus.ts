export type BudgetSourceStatus = "healthy" | "warning" | "critical";

/** Status op basis van resterend saldo t.o.v. totaal. */
export function getBudgetSourceStatus(remaining: number, total: number): BudgetSourceStatus {
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const safeRemaining = Number.isFinite(remaining) ? remaining : 0;
  if (safeTotal <= 0) return "healthy";
  const remainingPct = safeRemaining / safeTotal;
  if (remainingPct < 0.1) return "critical";
  if (remainingPct < 0.3) return "warning";
  return "healthy";
}

export function budgetSourceStatusAmountClass(status: BudgetSourceStatus): string {
  switch (status) {
    case "critical":
      return "text-red-600 dark:text-red-400";
    case "warning":
      return "text-amber-600 dark:text-amber-400";
    case "healthy":
      return "text-emerald-600 dark:text-emerald-400";
  }
}

export function budgetSourceStatusBarClass(status: BudgetSourceStatus): string {
  switch (status) {
    case "critical":
      return "bg-red-500";
    case "warning":
      return "bg-amber-500";
    case "healthy":
      return "bg-emerald-500";
  }
}

export function budgetSourceStatusTrackClass(status: BudgetSourceStatus): string {
  switch (status) {
    case "critical":
      return "bg-red-100 dark:bg-red-950/40";
    case "warning":
      return "bg-amber-100 dark:bg-amber-950/40";
    case "healthy":
      return "bg-emerald-100 dark:bg-emerald-950/40";
  }
}
