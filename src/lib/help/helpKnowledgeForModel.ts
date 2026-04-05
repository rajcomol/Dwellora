import { allArticles } from "@/content/help/registry";
import type { HelpArticleId } from "@/content/help/types";
import { getHelpKbMaxChars, truncateTextForModel, type TruncateResult } from "@/lib/ai/limits";
import nl from "@/i18n/locales/nl.json";

type NlArticle = { title?: string; summary?: string; body?: string };

function articleFromNl(id: HelpArticleId): NlArticle | null {
  const articles = nl.help?.article as Record<string, NlArticle> | undefined;
  const a = articles?.[id];
  return a ?? null;
}

/**
 * Full help text from locale + registry (same source as Help Center UI).
 * Not truncated; use `getHelpKnowledgeForModel` for the API.
 */
export function buildHelpKnowledgeText(): string {
  const lines: string[] = ["RenoTasker — interne kennisbank (help-artikelen):", ""];
  for (const meta of allArticles()) {
    const a = articleFromNl(meta.id);
    if (!a) continue;
    const title = String(a.title ?? "");
    const summary = String(a.summary ?? "");
    const body = String(a.body ?? "");
    lines.push(`## ${meta.id}`);
    lines.push(`Titel: ${title}`);
    lines.push(`Samenvatting: ${summary}`);
    lines.push("");
    lines.push(body);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}

/** Serialized help KB capped for the chat model. */
export function getHelpKnowledgeForModel(): TruncateResult {
  const full = buildHelpKnowledgeText();
  return truncateTextForModel(full, getHelpKbMaxChars());
}
