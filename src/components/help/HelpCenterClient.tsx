"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { HELP_CATEGORIES } from "@/content/help/registry";
import type { HelpArticleId } from "@/content/help/types";
import { helpArticleIdFromTopicParam } from "@/lib/help/topic-param";
import { useI18n } from "@/i18n/provider";

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function articleKeys(id: HelpArticleId) {
  return {
    title: `help.article.${id}.title`,
    summary: `help.article.${id}.summary`,
    body: `help.article.${id}.body`,
  } as const;
}

export default function HelpCenterClient() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const topicParam = helpArticleIdFromTopicParam(searchParams.get("topic"));
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<HelpArticleId | null>(null);
  const openArticleId = topicParam ?? expandedId;

  useEffect(() => {
    if (!topicParam) return;
    queueMicrotask(() => {
      document.getElementById(`help-article-${topicParam}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [topicParam]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) {
      return HELP_CATEGORIES.map((c) => ({
        ...c,
        articles: c.articleIds.map((id) => ({ id, ...articleKeys(id) })),
      }));
    }
    return HELP_CATEGORIES.map((c) => {
      const articles = c.articleIds
        .map((id) => ({ id, ...articleKeys(id) }))
        .filter(({ id, title, summary }) => {
          const titleS = normalize(t(title));
          const sumS = normalize(t(summary));
          const bodyS = normalize(t(`help.article.${id}.body`));
          return (
            titleS.includes(q) ||
            sumS.includes(q) ||
            bodyS.includes(q) ||
            id.replace(/-/g, " ").includes(q)
          );
        });
      return { ...c, articles };
    }).filter((c) => c.articles.length > 0);
  }, [query, t]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{t("help.pageTitle")}</h1>
        <p className="text-sm text-renovation-concrete">{t("help.pageSubtitle")}</p>
      </header>

      <div>
        <label htmlFor="help-search" className="sr-only">
          {t("help.searchPlaceholder")}
        </label>
        <input
          id="help-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("help.searchPlaceholder")}
          className="w-full max-w-md rounded-xl border border-renovation-border bg-renovation-elevated px-4 py-2.5 text-sm text-zinc-900 shadow-sm outline-none ring-renovation-accent/30 placeholder:text-zinc-400 focus:border-renovation-accent focus:ring-2 dark:border-renovation-border dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-renovation-concrete">{t("help.searchNoResults")}</p>
      ) : (
        <div className="space-y-10">
          {filtered.map((cat) => (
            <section key={cat.id} className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-renovation-steel dark:text-renovation-accent">
                {t(cat.titleKey)}
              </h2>
              <ul className="space-y-3">
                {cat.articles.map((a) => {
                  const open = openArticleId === a.id;
                  return (
                    <li
                      key={a.id}
                      id={`help-article-${a.id}`}
                      className="rounded-xl border border-renovation-border bg-renovation-elevated shadow-sm dark:border-renovation-border dark:bg-renovation-elevated"
                    >
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-3 rounded-xl px-4 py-4 text-left text-sm transition-colors hover:bg-renovation-muted/50 dark:hover:bg-zinc-900/50"
                        onClick={() => {
                          if (topicParam) return;
                          setExpandedId(open ? null : a.id);
                        }}
                        aria-expanded={open}
                      >
                        <span>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-50">{t(a.title)}</span>
                          <span className="mt-1 block text-renovation-concrete">{t(a.summary)}</span>
                        </span>
                        <span className="shrink-0 text-xs font-medium text-renovation-steel dark:text-renovation-accent">
                          {open ? "−" : "+"}
                        </span>
                      </button>
                      {open ? (
                        <div className="border-t border-renovation-border px-4 pb-4 pt-3 text-sm leading-relaxed text-zinc-700 dark:border-renovation-border dark:text-zinc-200">
                          <p className="whitespace-pre-line">{t(`help.article.${a.id}.body`)}</p>
                          <p className="mt-4 text-xs text-renovation-concrete">
                            <Link
                              href={`/dashboard/help?topic=${encodeURIComponent(a.id)}`}
                              className="font-medium text-renovation-steel underline-offset-2 hover:underline dark:text-renovation-accent"
                            >
                              {t("help.openArticle")}: {t(a.title)}
                            </Link>
                          </p>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
