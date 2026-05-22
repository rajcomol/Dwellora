"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatMessageList from "@/components/chat/ChatMessageList";
import { useChatSession } from "@/components/chat/useChatSession";
import { useI18n } from "@/i18n/provider";

type ChatExperienceProps = {
  routeSuggestedProjectId: string | null;
  className?: string;
};

export default function ChatExperience({ routeSuggestedProjectId, className }: ChatExperienceProps) {
  const { t } = useI18n();
  const session = useChatSession({ routeSuggestedProjectId });
  const [settingsOpen, setSettingsOpen] = useState(true);
  const prevMessageCount = useRef<number | null>(null);

  const {
    messages,
    pending,
    error,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    followRouteProject,
    routeMatchesSelection,
    routeSuggestedProjectId: routeId,
    threads,
    setActiveThreadId,
    persistenceAvailable,
    sendMessage,
    listRef,
    threadSelectValue,
  } = session;

  useEffect(() => {
    const prev = prevMessageCount.current;
    startTransition(() => {
      if (prev !== null && prev === 0 && messages.length > 0) {
        setSettingsOpen(false);
      }
      if (messages.length === 0 && prev !== null && prev > 0) {
        setSettingsOpen(true);
      }
    });
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  const controls = (
    <div className="mb-4 grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium">{t("chat.projectContext")}</label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm outline-none focus:border-renovation-steel dark:border-renovation-border dark:bg-renovation-elevated"
        >
          {projects.length === 0 ? (
            <option value="">{t("chat.noProjectsOption")}</option>
          ) : (
            projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))
          )}
        </select>
        {routeId && !routeMatchesSelection ? (
          <button
            type="button"
            className="mt-2 text-xs font-medium text-renovation-steel underline decoration-renovation-accent/50 underline-offset-2 hover:text-renovation-accent dark:text-foreground"
            onClick={followRouteProject}
          >
            {t("chat.useProjectFromPage")}
          </button>
        ) : null}
        {routeId && routeMatchesSelection ? (
          <p className="mt-2 text-xs text-renovation-concrete">{t("chat.projectFollowsPage")}</p>
        ) : null}
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">{t("chat.savedConversations")}</label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={threadSelectValue}
            onChange={(e) => {
              const v = e.target.value;
              setActiveThreadId(v === "new" ? "new" : v);
            }}
            className="w-full flex-1 rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm outline-none focus:border-renovation-steel dark:border-renovation-border dark:bg-renovation-elevated"
            disabled={!persistenceAvailable}
          >
            <option value="new">{t("chat.newConversation")}</option>
            {threads.map((th) => (
              <option key={th.id} value={th.id}>
                {th.title}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="secondary"
            className="w-full shrink-0 sm:w-auto"
            disabled={!persistenceAvailable}
            onClick={() => setActiveThreadId("new")}
          >
            {t("chat.startFresh")}
          </Button>
        </div>
        {!persistenceAvailable ? (
          <p className="mt-2 text-xs text-renovation-concrete">{t("chat.persistHintOff")}</p>
        ) : (
          <p className="mt-2 text-xs text-renovation-concrete">{t("chat.persistHintOn")}</p>
        )}
      </div>
    </div>
  );

  const messageColumn = (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div ref={listRef} className="min-h-0 flex-1 space-y-0 overflow-auto pr-1">
        {messages.length === 0 ? (
          <div className="rounded-md border border-dashed border-renovation-border bg-renovation-elevated p-6 text-sm text-renovation-concrete dark:border-renovation-border dark:bg-renovation-elevated">
            {t("chat.emptyThread")}
          </div>
        ) : (
          <>
            <ChatMessageList messages={messages} />
            {pending ? (
              <div className="mt-3 flex items-center gap-2 border-t border-renovation-border pt-3 text-sm text-renovation-concrete dark:border-renovation-border">
                <span
                  className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-renovation-border border-t-renovation-accent dark:border-renovation-border dark:border-t-renovation-accent"
                  aria-hidden
                />
                <span>{t("chat.sending")}</span>
              </div>
            ) : null}
          </>
        )}
      </div>

      {error ? <div className="text-xs text-red-600 dark:text-red-400">{error}</div> : null}

      <ChatComposer onSend={sendMessage} disabled={pending} pending={pending} />
    </div>
  );

  const disclaimerBlock = (
    <div className="mb-3 flex shrink-0 items-start justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="min-w-0 flex-1" role="note">
        <strong className="font-medium">{t("chat.disclaimerStrong")}</strong> {t("chat.disclaimerPanel")}
      </div>
      <button
        type="button"
        className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-amber-950 underline decoration-amber-800/40 underline-offset-2 hover:bg-amber-100/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/40 dark:focus-visible:outline-amber-400"
        onClick={() => setSettingsOpen(false)}
      >
        {t("chat.hideSettings")}
      </button>
    </div>
  );

  const collapsedBar = (
    <div className="mb-2 flex shrink-0 items-center justify-between gap-2 rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 dark:border-renovation-border dark:bg-renovation-muted/80">
      <p className="min-w-0 truncate text-xs text-renovation-concrete">{t("chat.collapsedHint")}</p>
      <button
        type="button"
        className="shrink-0 rounded-md border border-renovation-border bg-renovation-elevated px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-renovation-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-renovation-accent dark:border-renovation-border dark:bg-renovation-muted dark:text-foreground dark:hover:bg-renovation-muted"
        onClick={() => setSettingsOpen(true)}
      >
        {t("chat.showSettings")}
      </button>
    </div>
  );

  return (
    <div className={["flex h-full min-h-0 flex-1 flex-col", className].filter(Boolean).join(" ")}>
      {settingsOpen ? disclaimerBlock : collapsedBar}
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {settingsOpen ? controls : null}
        {messageColumn}
      </Card>
    </div>
  );
}
