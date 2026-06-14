import { kostenCategoryLabel } from "@/lib/finances/kostenraming";
import type { ProjectExpense, Task } from "@/lib/renovation/types";

export type KostenRegelType = "taak" | "losse_uitgave";
export type KostenStatus = "geschat" | "werkelijk";

export interface KostenRegel {
  id: string;
  source_id: string;
  type: KostenRegelType;
  omschrijving: string;
  categorie: string;
  bedrag: number;
  status: KostenStatus;
  datum?: string;
  gekoppeld_aan_depot?: boolean;
}

const LOSSE_UITGAVE_CATEGORIE = "Overig";

function taskBedrag(task: Task): number {
  const actual = Number.isFinite(task.actualCost) ? task.actualCost : 0;
  if (actual > 0) return actual;
  return task.estimatedCost != null && Number.isFinite(task.estimatedCost) ? task.estimatedCost : 0;
}

function taskStatus(task: Task): KostenStatus {
  const actual = Number.isFinite(task.actualCost) ? task.actualCost : 0;
  return actual > 0 ? "werkelijk" : "geschat";
}

function sortPriority(regel: KostenRegel): number {
  return regel.status === "geschat" ? 1 : 0;
}

export function mergeKostenItems(tasks: Task[], expenses: ProjectExpense[]): KostenRegel[] {
  const regels: KostenRegel[] = [];

  for (const task of tasks) {
    regels.push({
      id: `taak-${task.id}`,
      source_id: task.id,
      type: "taak",
      omschrijving: task.title,
      categorie: kostenCategoryLabel(task.title),
      bedrag: taskBedrag(task),
      status: taskStatus(task),
      datum: task.startDate ?? undefined,
      gekoppeld_aan_depot: task.fundedByConstructionDepot,
    });
  }

  for (const expense of expenses.filter((e) => !e.taskId)) {
    regels.push({
      id: `losse_uitgave-${expense.id}`,
      source_id: expense.id,
      type: "losse_uitgave",
      omschrijving: expense.title,
      categorie: LOSSE_UITGAVE_CATEGORIE,
      bedrag: Number.isFinite(expense.amount) ? expense.amount : 0,
      status: "werkelijk",
      datum: expense.spentOn ?? expense.createdAt.slice(0, 10),
      gekoppeld_aan_depot: expense.fundedByConstructionDepot,
    });
  }

  return regels.sort((a, b) => {
    const priorityDiff = sortPriority(a) - sortPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    return b.bedrag - a.bedrag;
  });
}
