"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { getBearerAuthHeaders } from "@/lib/supabase/client";
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import { CollaborationSectionSkeleton } from "@/components/ui/Skeleton";
import type { ID } from "@/lib/renovation/types";

type CollaborationState = {
  isOwner: boolean;
  collaboratorUserId: string | null;
  pendingInvite: { email: string; expiresAt: string } | null;
};

export default function ProjectCollaborationSection({ projectId }: { projectId: ID }) {
  const { t } = useI18n();
  const [state, setState] = useState<CollaborationState | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collabLoading, setCollabLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const headers = await getBearerAuthHeaders();
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/collaboration`, { headers });
      if (!res.ok) {
        setState(null);
        return;
      }
      const data = (await res.json()) as CollaborationState;
      setState(data);
    } finally {
      setCollabLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setCollabLoading(true);
    void load();
  }, [load]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInviteUrl(null);
    setEmailSent(false);
    setBusy(true);
    try {
      const headers = {
        ...(await getBearerAuthHeaders()),
        "Content-Type": "application/json",
      };
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/invites`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        inviteUrl?: string;
        emailSent?: boolean;
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 409) {
          setError(t("projectDetail.collaborationConflict"));
        } else {
          setError(body.error ?? t("projectDetail.collaborationError"));
        }
        return;
      }
      if (body.inviteUrl) setInviteUrl(body.inviteUrl);
      setEmailSent(body.emailSent === true);
      setEmail("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function cancelInvite() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/invites`, {
        method: "DELETE",
        headers: await getBearerAuthHeaders(),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? t("projectDetail.collaborationError"));
        return;
      }
      setInviteUrl(null);
      setEmailSent(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (collabLoading) {
    return <CollaborationSectionSkeleton />;
  }

  if (!state) {
    return null;
  }

  return (
    <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-sm dark:border-renovation-border dark:bg-renovation-elevated">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{t("projectDetail.collaborationTitle")}</h2>
      <p className="mt-1 text-xs text-renovation-concrete">{t("projectDetail.collaborationHint")}</p>

      {!state.isOwner ? (
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          {state.collaboratorUserId
            ? t("projectDetail.collaborationYouAreCollaborator")
            : t("projectDetail.collaborationOwnerOnly")}
        </p>
      ) : null}

      {state.isOwner && state.collaboratorUserId ? (
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{t("projectDetail.collaborationHasCollaborator")}</p>
      ) : null}

      {state.isOwner && !state.collaboratorUserId && state.pendingInvite ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {t("projectDetail.collaborationPending", {
              email: state.pendingInvite.email,
              expires: formatDisplayDate(state.pendingInvite.expiresAt),
            })}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("projectDetail.collaborationPendingFooter")}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void cancelInvite()}>
              {t("projectDetail.collaborationCancelInvite")}
            </Button>
          </div>
        </div>
      ) : null}

      {state.isOwner && !state.collaboratorUserId && !state.pendingInvite ? (
        <form className="mt-4 space-y-3" onSubmit={(e) => void sendInvite(e)}>
          <div>
            <label
              htmlFor="collab-email"
              className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              {t("projectDetail.collaborationInviteEmail")}
            </label>
            <input
              id="collab-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("login.placeholderEmail")}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          <Button type="submit" disabled={busy || !email.trim()}>
            {t("projectDetail.collaborationSendInvite")}
          </Button>
        </form>
      ) : null}

      {inviteUrl ? (
        <div className="mt-4 space-y-3">
          {emailSent ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{t("projectDetail.collaborationEmailSent")}</p>
          ) : (
            <p className="text-sm text-amber-800 dark:text-amber-200/90">{t("projectDetail.collaborationEmailNotSent")}</p>
          )}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("projectDetail.collaborationInviteLink")}</p>
          <p className="mt-1 break-all font-mono text-xs text-zinc-800 dark:text-zinc-200">{inviteUrl}</p>
          <button
            type="button"
            className="mt-2 text-sm text-cyan-700 underline hover:text-cyan-600 dark:text-cyan-400"
            onClick={() => void copyLink(inviteUrl)}
          >
            {copied ? t("projectDetail.collaborationCopied") : t("projectDetail.collaborationCopyLink")}
          </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
