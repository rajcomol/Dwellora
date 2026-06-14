import { taskBouwdepotChargeAmount } from "@/lib/dashboard/bouwdepot";
import type {
  BouwdepotDeclaratie,
  BouwdepotDeclaratieStatus,
  ProjectExpense,
  Task,
} from "@/lib/renovation/types";

export type BouwdepotRegelType = "declaratie" | "losse_uitgave" | "taak";
export type BouwdepotRegelStatus = "open" | "ingediend" | "uitbetaald" | "gekoppeld";

export interface BouwdepotRegel {
  id: string;
  source_id: string;
  type: BouwdepotRegelType;
  omschrijving: string;
  bedrag: number;
  datum?: string;
  status: BouwdepotRegelStatus;
  declaratieStatus?: BouwdepotDeclaratieStatus;
  editable: boolean;
}

function declaratieDatum(decl: BouwdepotDeclaratie): string | undefined {
  const raw = decl.uitbetaaldOp ?? decl.ingediendOp ?? decl.aangemaaktOp;
  return raw ? raw.slice(0, 10) : undefined;
}

function declaratieDisplayStatus(status: BouwdepotDeclaratieStatus): BouwdepotRegelStatus {
  if (status === "uitbetaald") return "uitbetaald";
  if (status === "ingediend" || status === "uitbetaling_verwacht") return "ingediend";
  return "open";
}

function declaratieSortPriority(status: BouwdepotDeclaratieStatus): number {
  if (status === "ingediend" || status === "uitbetaling_verwacht") return 0;
  if (status === "open") return 1;
  return 2;
}

export function mergeBouwdepotItems(
  projectId: string,
  declaraties: BouwdepotDeclaratie[],
  expenses: ProjectExpense[],
  tasks: Task[]
): BouwdepotRegel[] {
  const regels: BouwdepotRegel[] = [];

  for (const decl of declaraties.filter((d) => d.projectId === projectId)) {
    regels.push({
      id: `declaratie-${decl.id}`,
      source_id: decl.id,
      type: "declaratie",
      omschrijving: decl.omschrijving,
      bedrag: Number.isFinite(decl.bedrag) ? decl.bedrag : 0,
      datum: declaratieDatum(decl),
      status: declaratieDisplayStatus(decl.status),
      declaratieStatus: decl.status,
      editable: true,
    });
  }

  for (const expense of expenses.filter(
    (e) => e.projectId === projectId && e.fundedByConstructionDepot
  )) {
    regels.push({
      id: `losse_uitgave-${expense.id}`,
      source_id: expense.id,
      type: "losse_uitgave",
      omschrijving: expense.title,
      bedrag: Number.isFinite(expense.amount) ? expense.amount : 0,
      datum: expense.spentOn ?? expense.createdAt.slice(0, 10),
      status: "gekoppeld",
      editable: false,
    });
  }

  for (const task of tasks.filter(
    (t) => t.projectId === projectId && t.fundedByConstructionDepot
  )) {
    regels.push({
      id: `taak-${task.id}`,
      source_id: task.id,
      type: "taak",
      omschrijving: task.title,
      bedrag: taskBouwdepotChargeAmount(task),
      datum: task.startDate ?? undefined,
      status: "gekoppeld",
      editable: false,
    });
  }

  return regels.sort((a, b) => {
    const aIsDecl = a.type === "declaratie";
    const bIsDecl = b.type === "declaratie";
    if (aIsDecl && !bIsDecl) return -1;
    if (!aIsDecl && bIsDecl) return 1;

    if (aIsDecl && bIsDecl) {
      const aPri = declaratieSortPriority(a.declaratieStatus ?? "open");
      const bPri = declaratieSortPriority(b.declaratieStatus ?? "open");
      if (aPri !== bPri) return aPri - bPri;
    }

    return b.bedrag - a.bedrag;
  });
}
