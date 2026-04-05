import type { HelpArticleId } from "@/content/help/types";

const ALLOWED: HelpArticleId[] = [
  "welcome-overview",
  "navigation-sidebar",
  "projects-create",
  "rooms-tasks",
  "planning-timeline",
  "quotes-offertes",
  "finances-expenses",
  "kluscoach-ai",
  "reports-insights",
  "settings-security",
  "collaboration-invites",
];

export function helpArticleIdFromTopicParam(raw: string | null): HelpArticleId | null {
  if (!raw) return null;
  return ALLOWED.includes(raw as HelpArticleId) ? (raw as HelpArticleId) : null;
}
