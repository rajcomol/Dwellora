export type HelpCategoryId =
  | "getting-started"
  | "projects-rooms"
  | "tasks-planning"
  | "sfeerbeeld"
  | "finances-budget"
  | "quotes-documents"
  | "ai-coach"
  | "settings-account"
  | "troubleshooting";

export type HelpArticleId =
  | "welcome-overview"
  | "navigation-sidebar"
  | "dashboard-metrics"
  | "projects-create"
  | "rooms-tasks"
  | "tasks-manage"
  | "planning-timeline"
  | "sfeerbeeld"
  | "finances-expenses"
  | "bouwdepot"
  | "quotes-offertes"
  | "kluscoach-ai"
  | "settings-security"
  | "collaboration-invites"
  | "privacy-data"
  | "errors-session";

export type HelpArticle = {
  id: HelpArticleId;
  categoryId: HelpCategoryId;
  /** Lowercase tokens for client-side search */
  tags: string[];
};
