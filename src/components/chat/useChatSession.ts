"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@/components/chat/ChatMessageItem";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import { getBearerAuthHeaders, supabase } from "@/lib/supabase/client";
import { chatPostBodySchema } from "@/lib/validation/schemas";

function makeId(prefix: string) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

/**
 * Kiest een rustige, niet-technische i18n-sleutel op basis van de HTTP-status.
 * Toont nooit rauwe servertekst of statuscodes aan de gebruiker.
 */
function chatErrorKey(status: number): string {
  if (status === 429) return "chat.errorTooBusy";
  if (status === 401 || status === 403) return "chat.errorSessionExpired";
  return "chat.errorGeneral";
}

export type ThreadListItem = { id: string; title: string; projectId: string | null; updatedAt: string };

export function useChatSession(options: { routeSuggestedProjectId: string | null }) {
  const { t } = useI18n();
  const { projects } = useRenovation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string>("");
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | "new">("new");
  const [persistenceAvailable, setPersistenceAvailable] = useState(false);

  const userPinnedProject = useRef(false);
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
      setSelectedProjectIdState("");
      return;
    }
    setSelectedProjectIdState((prev) => {
      const validPrev = Boolean(prev && projects.some((p) => p.id === prev));
      if (userPinnedProject.current) {
        return validPrev ? prev : projects[0].id;
      }
      const routeId = options.routeSuggestedProjectId;
      if (routeId && projects.some((p) => p.id === routeId)) {
        return routeId;
      }
      return validPrev ? prev : projects[0].id;
    });
  }, [projects, options.routeSuggestedProjectId]);

  const setSelectedProjectId = useCallback((id: string) => {
    userPinnedProject.current = true;
    setSelectedProjectIdState(id);
  }, []);

  const followRouteProject = useCallback(() => {
    const routeId = options.routeSuggestedProjectId;
    if (routeId && projects.some((p) => p.id === routeId)) {
      userPinnedProject.current = false;
      setSelectedProjectIdState(routeId);
    }
  }, [options.routeSuggestedProjectId, projects]);

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

  const sendMessage = useCallback(
    async (message: string) => {
      setError(null);

      const body: Record<string, string | undefined> = {
        message,
        ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
        ...(persistenceAvailable && activeThreadId !== "new" ? { threadId: activeThreadId } : {}),
      };
      const parsedBody = chatPostBodySchema.safeParse(body);
      if (!parsedBody.success) {
        setError(t("chat.errorMessageInvalid"));
        return;
      }

      const userMessage: ChatMessage = {
        id: makeId("m"),
        role: "user",
        content: message,
      };

      setMessages((prev) => [...prev, userMessage]);
      setPending(true);

      try {
        const authHeaders = await getBearerAuthHeaders();

        let res: Response;
        try {
          res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify(body),
          });
        } catch (netErr) {
          console.error("chat netwerkfout", netErr);
          setError(t("chat.errorOffline"));
          return;
        }

        if (!res.ok) {
          // Rauwe servertekst nooit tonen; wel loggen voor debugging.
          const text = await res.text().catch(() => "");
          console.error("chat fout", res.status, text);
          setError(t(chatErrorKey(res.status)));
          return;
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
        console.error("chat onverwachte fout", e);
        setError(t("chat.errorSendFailed"));
      } finally {
        setPending(false);
      }
    },
    [activeThreadId, persistenceAvailable, refreshThreads, selectedProjectId, t]
  );

  const threadSelectValue = useMemo(() => activeThreadId, [activeThreadId]);

  const routeMatchesSelection = useMemo(() => {
    if (!options.routeSuggestedProjectId || !selectedProjectId) return false;
    return options.routeSuggestedProjectId === selectedProjectId;
  }, [options.routeSuggestedProjectId, selectedProjectId]);

  return {
    messages,
    pending,
    error,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    followRouteProject,
    routeMatchesSelection,
    routeSuggestedProjectId: options.routeSuggestedProjectId,
    threads,
    activeThreadId,
    setActiveThreadId,
    persistenceAvailable,
    sendMessage,
    listRef,
    threadSelectValue,
    refreshThreads,
  };
}
