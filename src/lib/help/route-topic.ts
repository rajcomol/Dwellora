import type { HelpArticleId } from "@/content/help/types";

/**
 * Maps current pathname to a suggested kennisbank article id for "Hulp bij dit scherm".
 * Patterns are checked in order; first match wins.
 */
const ROUTE_TOPIC_RULES: { test: RegExp; topic: HelpArticleId }[] = [
  { test: /^\/dashboard\/?$/, topic: "welcome-overview" },
  { test: /^\/dashboard\/help/, topic: "navigation-sidebar" },
  { test: /^\/dashboard\/rooms\/[^/]+/, topic: "tasks-manage" },
  { test: /^\/dashboard\/rooms/, topic: "rooms-tasks" },
  { test: /^\/dashboard\/planner/, topic: "sfeerbeeld" },
  { test: /^\/dashboard\/planning/, topic: "planning-timeline" },
  { test: /^\/dashboard\/projects\/[^/]+\/planning/, topic: "planning-timeline" },
  { test: /^\/dashboard\/projects\/[^/]+\/finances/, topic: "finances-expenses" },
  { test: /^\/dashboard\/projects\/[^/]+\/settings/, topic: "settings-security" },
  { test: /^\/dashboard\/finances/, topic: "finances-expenses" },
  { test: /^\/dashboard\/bouwdepot/, topic: "bouwdepot" },
  { test: /^\/dashboard\/quotes/, topic: "quotes-offertes" },
  { test: /^\/dashboard\/settings/, topic: "settings-security" },
  { test: /^\/dashboard\/projects\/?$/, topic: "projects-create" },
];

export function helpTopicForPath(pathname: string): HelpArticleId | null {
  const p = pathname.replace(/\/$/, "") || "/";
  for (const rule of ROUTE_TOPIC_RULES) {
    if (rule.test.test(p)) return rule.topic;
  }
  return null;
}
