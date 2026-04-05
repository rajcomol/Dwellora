import type { RenovationPhase } from "@/lib/renovation/phases";

export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type ID = string;

export type { RenovationPhase };

export interface Project {
  id: ID;
  name: string;
  totalBudget: number;
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
  title: string;
  roomId: ID;
  /** Planning / hub grouping: Slopen → … → Nazorg */
  renovationPhase: RenovationPhase;
  status: TaskStatus;
  estimatedCost: number;
  actualCost: number;
  durationDays: number;
  priority: TaskPriority;
  description: string;
  sortOrder: number;
  /** ISO date string (YYYY-MM-DD) or null */
  startDate: string | null;
  /** project_team_roster row for this project, or null */
  assignedRosterId: ID | null;
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
  projectExpenses: ProjectExpense[];
  expenseDocuments: ExpenseDocument[];
  taskDependencies: TaskDependency[];
  taskAttachments: TaskAttachment[];
  checklistItems: KeyHandoverChecklistItem[];
  teamRoster: TeamRosterEntry[];
}
