import type { BouwdepotStatus, ProjectExpense } from "@/lib/renovation/types";

export interface BouwdepotRegel {
  id: string;
  source_id: string;
  omschrijving: string;
  bedrag: number;
  datum?: string;
  bouwdepotStatus: BouwdepotStatus;
}

const STATUS_SORT: Record<BouwdepotStatus, number> = {
  ingediend: 0,
  open: 1,
  uitbetaald: 2,
};

/** Alleen kostenposten gekoppeld aan het bouwdepot. */
export function mergeBouwdepotItems(projectId: string, expenses: ProjectExpense[]): BouwdepotRegel[] {
  return expenses
    .filter((e) => e.projectId === projectId && e.fundedByConstructionDepot)
    .map((expense) => ({
      id: `kostenpost-${expense.id}`,
      source_id: expense.id,
      omschrijving: expense.title,
      bedrag: Number.isFinite(expense.amount) ? expense.amount : 0,
      datum: expense.spentOn ?? expense.createdAt.slice(0, 10),
      bouwdepotStatus: expense.bouwdepotStatus,
    }))
    .sort((a, b) => {
      const statusDiff = STATUS_SORT[a.bouwdepotStatus] - STATUS_SORT[b.bouwdepotStatus];
      if (statusDiff !== 0) return statusDiff;
      return b.bedrag - a.bedrag;
    });
}
