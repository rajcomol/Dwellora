import type { HelpArticle, HelpArticleId, HelpCategoryId } from "./types";

export type HelpCategoryDef = {
  id: HelpCategoryId;
  titleKey: string;
  articleIds: HelpArticleId[];
};

export const HELP_CATEGORIES: HelpCategoryDef[] = [
  {
    id: "getting-started",
    titleKey: "help.category.gettingStarted",
    articleIds: ["welcome-overview", "navigation-sidebar"],
  },
  {
    id: "projects-rooms",
    titleKey: "help.category.projectsRooms",
    articleIds: ["projects-create", "rooms-tasks"],
  },
  {
    id: "tasks-planning",
    titleKey: "help.category.tasksPlanning",
    articleIds: ["planning-timeline"],
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
];

const ARTICLE_META: Record<HelpArticleId, Pick<HelpArticle, "categoryId" | "tags">> = {
  "welcome-overview": {
    categoryId: "getting-started",
    tags: ["dashboard", "overzicht", "start", "welkom", "metrics"],
  },
  "navigation-sidebar": {
    categoryId: "getting-started",
    tags: ["menu", "navigatie", "projecten", "planning", "instellingen"],
  },
  "projects-create": {
    categoryId: "projects-rooms",
    tags: ["project", "aanmaken", "budget", "adres"],
  },
  "rooms-tasks": {
    categoryId: "projects-rooms",
    tags: ["kamer", "ruimte", "taak", "prioriteit", "status"],
  },
  "planning-timeline": {
    categoryId: "tasks-planning",
    tags: ["planning", "tijdlijn", "afhankelijkheden", "volgorde"],
  },
  "quotes-offertes": {
    tags: ["offerte", "pdf", "document", "vergelijken", "upload"],
    categoryId: "quotes-documents",
  },
  "finances-expenses": {
    categoryId: "finances-budget",
    tags: ["financiën", "uitgave", "bon", "factuur", "budget"],
  },
  "kluscoach-ai": {
    categoryId: "ai-coach",
    tags: ["ai", "kluscoach", "chat", "hulp", "vragen"],
  },
  "reports-insights": {
    categoryId: "reports",
    tags: ["rapport", "kosten", "schatting", "werkelijk"],
  },
  "settings-security": {
    categoryId: "settings-account",
    tags: ["instellingen", "wachtwoord", "thema", "account"],
  },
  "collaboration-invites": {
    categoryId: "settings-account",
    tags: ["uitnodiging", "samenwerken", "medebewoner", "delen"],
  },
};

export function getArticleMeta(id: HelpArticleId): HelpArticle {
  const m = ARTICLE_META[id];
  return { id, categoryId: m.categoryId, tags: m.tags };
}

export function allArticles(): HelpArticle[] {
  return (Object.keys(ARTICLE_META) as HelpArticleId[]).map(getArticleMeta);
}
