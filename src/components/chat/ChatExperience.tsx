"use client";

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

  const controls = (
    <div className="mb-4 grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-medium">{t("chat.projectContext")}</label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
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
            className="mt-2 text-xs font-medium text-renovation-steel underline decoration-renovation-accent/50 underline-offset-2 hover:text-renovation-accent dark:text-zinc-300"
            onClick={followRouteProject}
          >
            {t("chat.useProjectFromPage")}
          </button>
        ) : null}
        {routeId && routeMatchesSelection ? (
          <p className="mt-2 text-xs text-zinc-500">{t("chat.projectFollowsPage")}</p>
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
            className="w-full flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
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
          <p className="mt-2 text-xs text-zinc-500">{t("chat.persistHintOff")}</p>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">{t("chat.persistHintOn")}</p>
        )}
      </div>
    </div>
  );

  const inner = (
    <>
      {controls}
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div ref={listRef} className="min-h-0 flex-1 space-y-0 overflow-auto pr-1">
          {messages.length === 0 ? (
            <div className="rounded-md border border-dashed border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
              {t("chat.emptyThread")}
            </div>
          ) : (
            <ChatMessageList messages={messages} />
          )}
        </div>

        {error ? <div className="text-xs text-red-600 dark:text-red-400">{error}</div> : null}

        <ChatComposer onSend={sendMessage} disabled={pending} />
      </div>
    </>
  );

  return (
    <div className={["flex h-full min-h-0 flex-1 flex-col", className].filter(Boolean).join(" ")}>
      <div
        className="mb-3 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
        role="note"
      >
        <strong className="font-medium">{t("chat.disclaimerStrong")}</strong> {t("chat.disclaimerPanel")}
      </div>
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">{inner}</Card>
    </div>
  );
}
