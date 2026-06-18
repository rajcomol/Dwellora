// Bij elke UI/functie-wijziging: werk het bijbehorende help-artikel hier én in nl.json bij (kennisbank mag niet verouderen).

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
    articleIds: ["welcome-overview", "projects-create", "navigation-sidebar", "dashboard-metrics"],
  },
  {
    id: "projects-rooms",
    titleKey: "help.category.projectsRooms",
    articleIds: ["rooms-tasks", "tasks-manage"],
  },
  {
    id: "tasks-planning",
    titleKey: "help.category.tasksPlanning",
    articleIds: ["planning-timeline"],
  },
  {
    id: "sfeerbeeld",
    titleKey: "help.category.sfeerbeeld",
    articleIds: ["sfeerbeeld"],
  },
  {
    id: "finances-budget",
    titleKey: "help.category.financesBudget",
    articleIds: ["finances-expenses", "bouwdepot"],
  },
  {
    id: "quotes-documents",
    titleKey: "help.category.quotesDocuments",
    articleIds: ["quotes-offertes"],
  },
  {
    id: "ai-coach",
    titleKey: "help.category.aiCoach",
    articleIds: ["kluscoach-ai"],
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
    tags: ["dashboard", "overzicht", "start", "welkom", "volgende stap"],
  },
  "navigation-sidebar": {
    categoryId: "getting-started",
    tags: ["menu", "navigatie", "tabbladen", "project", "help", "kluscoach"],
  },
  "dashboard-metrics": {
    categoryId: "getting-started",
    tags: ["kerncijfers", "budget", "taken", "bouwdepot", "opleverdatum", "volgende stap"],
  },
  "projects-create": {
    categoryId: "getting-started",
    tags: ["project", "aanmaken", "kiezen", "switcher", "budget", "wisselen"],
  },
  "rooms-tasks": {
    categoryId: "projects-rooms",
    tags: ["kamer", "ruimte", "kaart", "voortgang", "overzicht"],
  },
  "tasks-manage": {
    categoryId: "projects-rooms",
    tags: ["taak", "taken", "status", "prioriteit", "duur", "gedeeld", "multi-ruimte"],
  },
  "planning-timeline": {
    categoryId: "tasks-planning",
    tags: ["planning", "tijdlijn", "startdatum", "volgorde", "gantt", "filter", "ruimte", "groepering"],
  },
  sfeerbeeld: {
    categoryId: "sfeerbeeld",
    tags: ["sfeerbeeld", "ai", "foto", "visualisatie", "planner", "gevel", "voordeur"],
  },
  "quotes-offertes": {
    categoryId: "quotes-documents",
    tags: ["offerte", "pdf", "document", "vergelijken", "upload", "samenvatting", "ai"],
  },
  "finances-expenses": {
    categoryId: "finances-budget",
    tags: ["financiën", "kostenpost", "budget", "uitgave", "categorie", "filter"],
  },
  bouwdepot: {
    categoryId: "finances-budget",
    tags: ["bouwdepot", "hypotheek", "depot", "ingediend", "uitbetaald", "bank"],
  },
  "kluscoach-ai": {
    categoryId: "ai-coach",
    tags: ["ai", "kluscoach", "chat", "hulp", "vragen", "thread", "project"],
  },
  "settings-security": {
    categoryId: "settings-account",
    tags: ["instellingen", "wachtwoord", "thema", "account", "checklist", "projectgegevens"],
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
