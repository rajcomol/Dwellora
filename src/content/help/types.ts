export type HelpCategoryId =
  | "getting-started"
  | "projects-rooms"
  | "tasks-planning"
  | "quotes-documents"
  | "finances-budget"
  | "ai-coach"
  | "reports"
  | "settings-account"
  | "troubleshooting";

export type HelpArticleId =
  | "welcome-overview"
  | "navigation-sidebar"
  | "dashboard-metrics"
  | "projects-create"
  | "project-samenwerking"
  | "rooms-tasks"
  | "planning-timeline"
  | "tasks-dependencies"
  | "quotes-offertes"
  | "finances-expenses"
  | "kluscoach-ai"
  | "reports-insights"
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
