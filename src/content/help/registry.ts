import type { HelpArticle, HelpArticleId, HelpCategoryId } from "./types";

export type HelpCategoryDef = {
  id: HelpCategoryId;
  titleKey: string;
  articleIds: HelpArticleId[];
};

/** Order matters for Kluscoach KB serialization: important topics first. */
export const HELP_CATEGORIES: HelpCategoryDef[] = [
  {
    id: "getting-started",
    titleKey: "help.category.gettingStarted",
    articleIds: ["welcome-overview", "navigation-sidebar", "dashboard-metrics"],
  },
  {
    id: "projects-rooms",
    titleKey: "help.category.projectsRooms",
    articleIds: ["projects-create", "project-samenwerking", "rooms-tasks"],
  },
  {
    id: "tasks-planning",
    titleKey: "help.category.tasksPlanning",
    articleIds: ["planning-timeline", "tasks-dependencies"],
  },
  {
    id: "quotes-documents",
    titleKey: "help.category.quotesDocuments",
    articleIds: ["quotes-offertes"],
  },
  {
    id: "finances-budget",
    titleKey: "help.category.financesBudget",
    articleIds: ["finances-expenses"],
  },
  {
    id: "ai-coach",
    titleKey: "help.category.aiCoach",
    articleIds: ["kluscoach-ai"],
  },
  {
    id: "reports",
    titleKey: "help.category.reports",
    articleIds: ["reports-insights"],
  },
  {
    id: "settings-account",
    titleKey: "help.category.settingsAccount",
    articleIds: ["settings-security", "collaboration-invites"],
  },
  {
    id: "troubleshooting",
    titleKey: "help.category.troubleshooting",
    articleIds: ["privacy-data", "errors-session"],
  },
];

const ARTICLE_META: Record<HelpArticleId, Pick<HelpArticle, "categoryId" | "tags">> = {
  "welcome-overview": {
    categoryId: "getting-started",
    tags: ["dashboard", "overzicht", "start", "welkom", "metrics", "hero"],
  },
  "navigation-sidebar": {
    categoryId: "getting-started",
    tags: ["menu", "navigatie", "projecten", "planning", "instellingen", "hamburger", "zijbalk"],
  },
  "dashboard-metrics": {
    categoryId: "getting-started",
    tags: ["kerncijfers", "budget", "taken", "inzichten", "volgende stap", "grafiek"],
  },
  "projects-create": {
    categoryId: "projects-rooms",
    tags: ["project", "aanmaken", "budget", "adres", "sleutel", "nieuw"],
  },
  "project-samenwerking": {
    categoryId: "projects-rooms",
    tags: ["samenwerken", "medebewoner", "uitnodigen", "eigenaar", "delen", "project"],
  },
  "rooms-tasks": {
    categoryId: "projects-rooms",
    tags: ["kamer", "ruimte", "taak", "prioriteit", "status", "kosten", "upload"],
  },
  "planning-timeline": {
    categoryId: "tasks-planning",
    tags: ["planning", "tijdlijn", "volgorde", "doorlooptijd", "gantt"],
  },
  "tasks-dependencies": {
    categoryId: "tasks-planning",
    tags: ["afhankelijkheid", "blocked", "volgorde", "eerst", "dan"],
  },
  "quotes-offertes": {
    tags: ["offerte", "pdf", "document", "vergelijken", "upload", "samenvatting", "ai"],
    categoryId: "quotes-documents",
  },
  "finances-expenses": {
    categoryId: "finances-budget",
    tags: ["financiën", "uitgave", "bon", "factuur", "budget", "bewijsstuk"],
  },
  "kluscoach-ai": {
    categoryId: "ai-coach",
    tags: ["ai", "kluscoach", "chat", "hulp", "vragen", "thread", "project"],
  },
  "reports-insights": {
    categoryId: "reports",
    tags: ["rapport", "kosten", "schatting", "werkelijk", "filter", "export"],
  },
  "settings-security": {
    categoryId: "settings-account",
    tags: ["instellingen", "wachtwoord", "thema", "account", "locale", "taal"],
  },
  "collaboration-invites": {
    categoryId: "settings-account",
    tags: ["uitnodiging", "samenwerken", "medebewoner", "link", "email", "registreren"],
  },
  "privacy-data": {
    categoryId: "troubleshooting",
    tags: ["privacy", "gegevens", "opslag", "beveiliging", "documenten"],
  },
  "errors-session": {
    categoryId: "troubleshooting",
    tags: ["fout", "inloggen", "401", "sessie", "uitnodiging", "probleem"],
  },
};

export function getArticleMeta(id: HelpArticleId): HelpArticle {
  const m = ARTICLE_META[id];
  return { id, categoryId: m.categoryId, tags: m.tags };
}

export function allArticles(): HelpArticle[] {
  return (Object.keys(ARTICLE_META) as HelpArticleId[]).map(getArticleMeta);
}
