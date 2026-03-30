"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import LoginScreenChrome from "@/components/auth/LoginScreenChrome";
import { useI18n } from "@/i18n/provider";
import { getBearerAuthHeaders, supabase } from "@/lib/supabase/client";

function InviteAcceptInner() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "redirect_login" | "working" | "ok" | "err">("idle");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    if (!token?.trim()) {
      setStatus("err");
      setMessage(t("inviteAccept.missingToken"));
      return;
    }
    const tkn = token.trim();
    ran.current = true;

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
        setMessage(t("inviteAccept.error"));
        return;
      }
      setProjectId(typeof body.projectId === "string" ? body.projectId : null);
      setStatus("ok");
    }

    void run();
  }, [token, router, t]);

  if (status === "idle" || status === "redirect_login" || status === "working") {
    return (
      <p className="text-center text-sm text-zinc-200">
        {status === "working" ? t("inviteAccept.accepting") : t("common.loading")}
      </p>
    );
  }

  if (status === "err") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-red-200">{message ?? t("inviteAccept.error")}</p>
        <p className="text-xs text-zinc-400">{t("inviteAccept.needLogin")}</p>
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
