import type { HelpArticleId } from "@/content/help/types";

const ALLOWED: HelpArticleId[] = [
  "welcome-overview",
  "navigation-sidebar",
  "dashboard-metrics",
  "projects-create",
  "project-samenwerking",
  "rooms-tasks",
  "planning-timeline",
  "tasks-dependencies",
  "quotes-offertes",
  "finances-expenses",
  "kluscoach-ai",
  "reports-insights",
  "settings-security",
  "collaboration-invites",
  "privacy-data",
  "errors-session",
];

export function helpArticleIdFromTopicParam(raw: string | null): HelpArticleId | null {
  if (!raw) return null;
  return ALLOWED.includes(raw as HelpArticleId) ? (raw as HelpArticleId) : null;
}
