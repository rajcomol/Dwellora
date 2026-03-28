export interface DocumentRecord {
  id: string;
  projectId: string;
  fileName: string;
  filePath: string;
  createdAt: string;
  /** Persisted AI summary when available */
  aiSummary?: string | null;
}

