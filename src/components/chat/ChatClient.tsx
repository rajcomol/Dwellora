"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { ChatMessage } from "@/components/chat/ChatMessageItem";
import ChatMessageList from "@/components/chat/ChatMessageList";
import ChatComposer from "@/components/chat/ChatComposer";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import { getBearerAuthHeaders, supabase } from "@/lib/supabase/client";

function makeId(prefix: string) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

type ThreadListItem = { id: string; title: string; projectId: string | null; updatedAt: string };

export default function ChatClient() {
  const { t } = useI18n();
  const { projects } = useRenovation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | "new">("new");
  const [persistenceAvailable, setPersistenceAvailable] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const refreshThreads = useCallback(async () => {
    const authHeaders = await getBearerAuthHeaders();
    const authRecord = authHeaders as Record<string, string | undefined>;
    if (!authRecord.Authorization) {
      setPersistenceAvailable(false);
      setThreads([]);
      return;
    }
    const res = await fetch("/api/chat", { headers: authHeaders });
    if (!res.ok) {
      setPersistenceAvailable(false);
      return;
    }
    setPersistenceAvailable(true);
    const data = (await res.json()) as { threads?: ThreadListItem[] };
    setThreads(Array.isArray(data.threads) ? data.threads : []);
  }, []);

  useEffect(() => {
    void refreshThreads();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshThreads();
    });
    return () => subscription.unsubscribe();
  }, [refreshThreads]);

  useEffect(() => {
    if (projects.length === 0) {
      setSelectedProjectId("");
      return;
    }
    setSelectedProjectId((prev) =>
      prev && projects.some((project) => project.id === prev) ? prev : projects[0].id
    );
  }, [projects]);

  useEffect(() => {
    let cancelled = false;
    async function loadMessages() {
      if (activeThreadId === "new") {
        setMessages([]);
        return;
      }
      const authHeaders = await getBearerAuthHeaders();
      const res = await fetch(`/api/chat?threadId=${encodeURIComponent(activeThreadId)}`, {
        headers: authHeaders,
      });
      if (cancelled) return;
      if (!res.ok) {
        setError(t("chat.errorLoadThread"));
        return;
      }
      setError(null);
      const data = (await res.json()) as {
        messages?: Array<{ id: string; role: string; content: string }>;
      };
      const rows = data.messages ?? [];
      setMessages(
        rows.map((m) => ({
          id: m.id,
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        }))
      );
    }
    void loadMessages();
    return () => {
      cancelled = true;
    };
  }, [activeThreadId, t]);

  async function sendMessage(message: string) {
    setError(null);

    const userMessage: ChatMessage = {
      id: makeId("m"),
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPending(true);

    try {
      const authHeaders = await getBearerAuthHeaders();
      const body: Record<string, string | undefined> = {
        message,
        projectId: selectedProjectId || undefined,
      };
      if (persistenceAvailable && activeThreadId !== "new") {
        body.threadId = activeThreadId;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed with status ${res.status}`);
      }

      const data = (await res.json()) as { response?: string; threadId?: string | null };
      const assistantText = typeof data.response === "string" && data.response.trim().length > 0 ? data.response : "";

      if (data.threadId && persistenceAvailable) {
        if (activeThreadId === "new") {
          setActiveThreadId(data.threadId);
          void refreshThreads();
        }
      }

      const assistantMessage: ChatMessage = {
        id: makeId("m"),
        role: "assistant",
        content: assistantText,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("chat.errorSendFailed");
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  const threadSelectValue = useMemo(() => activeThreadId, [activeThreadId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("chat.title")}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("chat.subtitle")}</p>
        </div>
      </div>

      <div
        className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
        role="note"
      >
        <strong className="font-medium">{t("chat.disclaimerStrong")}</strong> {t("chat.disclaimerText")}
      </div>

      <Card>
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

        <div className="flex h-[55vh] flex-col gap-3">
          <div ref={listRef} className="flex-1 space-y-0 overflow-auto pr-1">
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
      </Card>
    </div>
  );
}
