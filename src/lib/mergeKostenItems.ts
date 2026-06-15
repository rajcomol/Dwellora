import { categorieLabel } from "@/lib/finances/kostenraming";
import type { BouwdepotStatus, KostCategorie, KostType, ProjectExpense } from "@/lib/renovation/types";

export type KostenStatus = KostType;

export interface KostenRegel {
  id: string;
  source_id: string;
  omschrijving: string;
  categorie: string;
  categorieId: KostCategorie;
  bedrag: number;
  kostType: KostType;
  gekoppeld_aan_depot: boolean;
  bouwdepotStatus: BouwdepotStatus;
  datum?: string;
}

function sortPriority(regel: KostenRegel): number {
  return regel.kostType === "geschat" ? 1 : 0;
}

/** Bouwt kostenregels puur uit project_expenses (geen taken). */
export function mergeKostenItems(expenses: ProjectExpense[]): KostenRegel[] {
  const regels: KostenRegel[] = expenses.map((expense) => ({
    id: `kostenpost-${expense.id}`,
    source_id: expense.id,
    omschrijving: expense.title,
    categorie: categorieLabel(expense.categorie),
    categorieId: expense.categorie,
    bedrag: Number.isFinite(expense.amount) ? expense.amount : 0,
    kostType: expense.kostType,
    gekoppeld_aan_depot: expense.fundedByConstructionDepot,
    bouwdepotStatus: expense.bouwdepotStatus,
    datum: expense.spentOn ?? expense.createdAt.slice(0, 10),
  }));

  return regels.sort((a, b) => {
    const priorityDiff = sortPriority(a) - sortPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    return b.bedrag - a.bedrag;
  });
}
