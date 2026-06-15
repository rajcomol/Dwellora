import type { RenovationPhase } from "@/lib/renovation/phases";

export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type ID = string;

export type { RenovationPhase };

export interface Project {
  id: ID;
  name: string;
  totalBudget: number;
  /** Eigen inbreng; null = not set */
  ownContribution: number | null;
  /** Totaal bouwdepot op projectniveau; null = not set */
  constructionDepotTotal: number | null;
  address: string;
  /** ISO date string (YYYY-MM-DD) or null */
  expectedKeyHandover: string | null;
  /** ISO date string (YYYY-MM-DD) or null — anchors the project planning timeline */
  planningStartDate: string | null;
  notes: string;
}

export interface Room {
  id: ID;
  name: string;
  projectId: ID;
}

export interface Task {
  id: ID;
  projectId: ID;
  title: string;
  /** One or more rooms this task appears in; empty = loose task */
  roomIds: ID[];
  /** Planning / hub grouping: Slopen → … → Nazorg */
  renovationPhase: RenovationPhase;
  status: TaskStatus;
  /** null = no estimate entered */
  estimatedCost: number | null;
  actualCost: number;
  durationDays: number;
  priority: TaskPriority;
  description: string;
  sortOrder: number;
  /** ISO date string (YYYY-MM-DD) or null */
  startDate: string | null;
  /** project_team_roster row for this project, or null */
  assignedRosterId: ID | null;
  /** Kosten van deze taak tellen mee voor het project-bouwdepot */
  fundedByConstructionDepot: boolean;
}

export type BouwdepotDeclaratieStatus = "open" | "ingediend" | "uitbetaling_verwacht" | "uitbetaald";

/** Declaratie bij bank voor terugbetaling uit bouwdepot. */
export interface BouwdepotDeclaratie {
  id: ID;
  projectId: ID;
  userId: ID;
  omschrijving: string;
  bedrag: number;
  status: BouwdepotDeclaratieStatus;
  /** ISO date (YYYY-MM-DD) or null */
  ingediendOp: string | null;
  /** ISO date (YYYY-MM-DD) or null */
  uitbetaaldOp: string | null;
  taakId: ID | null;
  notities: string;
  aangemaaktOp: string;
  bijgewerktOp: string;
}

export interface BouwdepotDeclaratieTotals {
  totaalUitbetaald: number;
  totaalIngediend: number;
  totaalOpen: number;
}

/** Bouwdepot-saldo per project (financieringsbron, geen uitgave). */
export interface ProjectConstructionDepotBalance {
  projectId: ID;
  totalAmount: number;
  usedAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  linkedTaskCount: number;
}

export type ExpenseDocumentType = "receipt" | "invoice" | "other";

/** Bewijsstuk (bon/factuur) gekoppeld aan een uitgave; niet voor offerte-PDF’s. */
export interface ExpenseDocument {
  id: ID;
  expenseId: ID;
  projectId: ID;
  documentType: ExpenseDocumentType;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSizeBytes: number | null;
  uploadedBy: ID | null;
  uploadedAt: string;
  retentionUntil: string | null;
  /** OCR/AI metadata (vendor, total_amount, …) — uitbreidbaar zonder migratie. */
  extractedMetadata: Record<string, unknown>;
}

export type KostType = "werkelijk" | "geschat";
export type KostCategorie =
  | "deuren"
  | "vloeren"
  | "elektra"
  | "sanitair"
  | "schilderwerk"
  | "dakwerk"
  | "keuken"
  | "overig";
export type BouwdepotStatus = "open" | "ingediend" | "uitbetaald";

/** Zelfstandige kostenpost op projectniveau (los van taken). */
export interface ProjectExpense {
  id: ID;
  projectId: ID;
  title: string;
  amount: number;
  /** ISO date (YYYY-MM-DD) of null */
  spentOn: string | null;
  notes: string;
  createdAt: string;
  /** Legacy: optionele taakkoppeling; nieuwe posten altijd null */
  taskId: ID | null;
  /** Bedrag telt mee voor het project-bouwdepot */
  fundedByConstructionDepot: boolean;
  kostType: KostType;
  categorie: KostCategorie;
  bouwdepotStatus: BouwdepotStatus;
}

export interface TaskDependency {
  id: ID;
  taskId: ID;
  dependsOnTaskId: ID;
}

export interface TaskAttachment {
  id: ID;
  taskId: ID;
  fileName: string;
  filePath: string;
  createdAt: string;
}

export interface KeyHandoverChecklistItem {
  id: ID;
  projectId: ID;
  title: string;
  isDone: boolean;
  sortOrder: number;
}

export interface TeamRosterEntry {
  id: ID;
  projectId: ID;
  displayName: string;
  email: string;
  roleHint: string;
  sortOrder: number;
}

export interface RenovationState {
  projects: Project[];
  rooms: Room[];
  tasks: Task[];
  declaraties: BouwdepotDeclaratie[];
  projectConstructionDepotBalances: ProjectConstructionDepotBalance[];
  projectExpenses: ProjectExpense[];
  expenseDocuments: ExpenseDocument[];
  taskDependencies: TaskDependency[];
  taskAttachments: TaskAttachment[];
  checklistItems: KeyHandoverChecklistItem[];
  teamRoster: TeamRosterEntry[];
}
