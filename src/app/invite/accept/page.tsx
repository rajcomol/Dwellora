"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import LoginScreenChrome from "@/components/auth/LoginScreenChrome";
import { useI18n } from "@/i18n/provider";
import { getBearerAuthHeaders, supabase } from "@/lib/supabase/client";

function readInviteTokenFromBrowser(searchParams: ReturnType<typeof useSearchParams>): string | null {
  const fromParams = searchParams.get("token")?.trim() ?? "";
  if (fromParams) return fromParams;
  if (typeof window !== "undefined") {
    const fromUrl = new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
    if (fromUrl) return fromUrl;
  }
  return null;
}

const INVITE_ERROR_I18N_KEYS: Record<string, string> = {
  email_mismatch: "inviteAccept.errorEmailMismatch",
  expired: "inviteAccept.errorExpired",
  invalid_or_expired: "inviteAccept.errorInvalidOrExpired",
  already_has_member: "inviteAccept.errorAlreadyHasMember",
  owner_cannot_accept_own_invite: "inviteAccept.errorOwnerSelf",
};

function InviteAcceptInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedToken = useMemo(() => readInviteTokenFromBrowser(searchParams), [searchParams]);
  const [status, setStatus] = useState<"idle" | "redirect_login" | "working" | "ok" | "err">("idle");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errHint, setErrHint] = useState<"needLogin" | "wrongAccount" | null>(null);
  const ranForToken = useRef<string | null>(null);

  useEffect(() => {
    if (!resolvedToken) return;

    const tkn = resolvedToken;
    if (ranForToken.current === tkn) return;
    ranForToken.current = tkn;

    async function run() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setStatus("redirect_login");
        const next = `/invite/accept?token=${encodeURIComponent(tkn)}`;
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      setStatus("working");
      const headers = {
        ...(await getBearerAuthHeaders()),
        "Content-Type": "application/json",
      };
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers,
        body: JSON.stringify({ token: tkn }),
      });
      const body = (await res.json().catch(() => ({}))) as { projectId?: string; error?: string };
      if (!res.ok) {
        setStatus("err");
        const code = typeof body.error === "string" ? body.error : "";
        const key = INVITE_ERROR_I18N_KEYS[code] ?? "inviteAccept.error";
        setMessage(t(key));
        setErrHint(code === "email_mismatch" ? "wrongAccount" : null);
        return;
      }
      setProjectId(typeof body.projectId === "string" ? body.projectId : null);
      setStatus("ok");
      setErrHint(null);
    }

    void run();
  }, [resolvedToken, router, t]);

  if (!resolvedToken) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-red-200">{t("inviteAccept.missingToken")}</p>
        <p className="text-xs text-zinc-400">{t("inviteAccept.needLogin")}</p>
      </div>
    );
  }

  if (status === "idle" || status === "redirect_login" || status === "working") {
    return (
      <p className="text-center text-sm text-zinc-200">
        {status === "idle" || status === "redirect_login" ? t("common.loading") : t("inviteAccept.accepting")}
      </p>
    );
  }

  if (status === "err") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-red-200">{message ?? t("inviteAccept.error")}</p>
        {errHint === "needLogin" ? (
          <p className="text-xs text-zinc-400">{t("inviteAccept.needLogin")}</p>
        ) : null}
        {errHint === "wrongAccount" ? (
          <p className="text-xs text-zinc-400">{t("inviteAccept.hintWrongAccount")}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-emerald-100">{t("inviteAccept.success")}</p>
      {projectId ? (
        <button
          type="button"
          className="rounded-full bg-cyan-400 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          onClick={() => router.replace(`/dashboard/projects/${projectId}`)}
        >
          {t("inviteAccept.goToProject")}
        </button>
      ) : (
        <button
          type="button"
          className="rounded-full bg-cyan-400 px-6 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          onClick={() => router.replace("/dashboard")}
        >
          {t("inviteAccept.goToDashboard")}
        </button>
      )}
    </div>
  );
}

function Fallback() {
  return <div className="h-24 animate-pulse rounded-xl bg-white/10" aria-busy="true" />;
}

export default function InviteAcceptPage() {
  const { t } = useI18n();
  return (
    <LoginScreenChrome belowLogo={<p className="text-sm text-white/90">{t("inviteAccept.title")}</p>}>
      <Suspense fallback={<Fallback />}>
        <InviteAcceptInner />
      </Suspense>
    </LoginScreenChrome>
  );
}
