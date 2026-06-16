import type { HelpArticleId } from "@/content/help/types";

const ALLOWED: HelpArticleId[] = [
  "welcome-overview",
  "navigation-sidebar",
  "dashboard-metrics",
  "projects-create",
  "rooms-tasks",
  "tasks-manage",
  "planning-timeline",
  "sfeerbeeld",
  "finances-expenses",
  "bouwdepot",
  "quotes-offertes",
  "kluscoach-ai",
  "settings-security",
  "collaboration-invites",
  "privacy-data",
  "errors-session",
];

export function helpArticleIdFromTopicParam(raw: string | null): HelpArticleId | null {
  if (!raw) return null;
  return ALLOWED.includes(raw as HelpArticleId) ? (raw as HelpArticleId) : null;
}
