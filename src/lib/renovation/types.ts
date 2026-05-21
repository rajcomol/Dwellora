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
  /** Optional construction depot (bouwdepot) funding this task */
  constructionDepotId: ID | null;
}

export interface ConstructionDepot {
  id: ID;
  projectId: ID;
  name: string;
  totalAmount: number;
  createdAt: string;
  userId: ID;
}

export interface ConstructionDepotBalance extends ConstructionDepot {
  spentEstimated: number;
  /** Project-level bouwdepot cap */
  projectDepotTotal: number;
  remainingEstimated: number;
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

/** Losse uitgaven op projectniveau (bouwmarkt, materiaal, enz.); optioneel gekoppeld aan een taak. */
export interface ProjectExpense {
  id: ID;
  projectId: ID;
  title: string;
  amount: number;
  /** ISO date (YYYY-MM-DD) of null */
  spentOn: string | null;
  notes: string;
  createdAt: string;
  /** Taak waar deze kosten bij horen, indien van toepassing */
  taskId: ID | null;
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
  constructionDepots: ConstructionDepot[];
  constructionDepotBalances: ConstructionDepotBalance[];
  projectExpenses: ProjectExpense[];
  expenseDocuments: ExpenseDocument[];
  taskDependencies: TaskDependency[];
  taskAttachments: TaskAttachment[];
  checklistItems: KeyHandoverChecklistItem[];
  teamRoster: TeamRosterEntry[];
}
