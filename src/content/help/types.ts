export type HelpCategoryId =
  | "getting-started"
  | "projects-rooms"
  | "tasks-planning"
  | "quotes-documents"
  | "finances-budget"
  | "ai-coach"
  | "reports"
  | "settings-account";

export type HelpArticleId =
  | "welcome-overview"
  | "navigation-sidebar"
  | "projects-create"
  | "rooms-tasks"
  | "planning-timeline"
  | "quotes-offertes"
  | "finances-expenses"
  | "kluscoach-ai"
  | "reports-insights"
  | "settings-security"
  | "collaboration-invites";

export type HelpArticle = {
  id: HelpArticleId;
  categoryId: HelpCategoryId;
  /** Lowercase tokens for client-side search */
  tags: string[];
};
