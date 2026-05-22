"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import AccountSettingsContent from "@/components/settings/AccountSettingsContent";
import ProjectSettingsForm from "@/components/settings/ProjectSettingsForm";
import SettingsSubtabNav, { type SettingsTab } from "@/components/settings/SettingsSubtabNav";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/i18n/provider";
import type { ID } from "@/lib/renovation/types";

function parseTab(value: string | null): SettingsTab {
  return value === "account" ? "account" : "project";
}

/** Consistente veldstijl voor nested project- en accountformulieren (light + dark). */
const SETTINGS_FORM_FIELD_CLASS =
  "[&_input]:border-renovation-border [&_input]:bg-renovation-elevated [&_input]:text-foreground [&_input]:placeholder:text-renovation-concrete [&_input]:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-renovation-accent/40 [&_textarea]:border-renovation-border [&_textarea]:bg-renovation-elevated [&_textarea]:text-foreground [&_textarea]:placeholder:text-renovation-concrete [&_textarea]:outline-none [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-renovation-accent/40";

type Props = {
  projectId?: ID;
  initialTab?: string | null;
};

export default function SettingsHubPageClient({ projectId, initialTab }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { projects, isRenovationDataReady } = useRenovation();

  const hasProject = Boolean(projectId);
  const project = useMemo(
    () => (projectId ? projects.find((p) => p.id === projectId) : undefined),
    [projects, projectId]
  );

  const tabFromUrl = parseTab(searchParams.get("tab") ?? initialTab ?? null);
  const [activeTab, setActiveTab] = useState<SettingsTab>(() =>
    hasProject ? tabFromUrl : "account"
  );

  useEffect(() => {
    const next = hasProject ? tabFromUrl : "account";
    setActiveTab(next);
  }, [hasProject, tabFromUrl]);

  const setTab = useCallback(
    (tab: SettingsTab) => {
      if (!hasProject && tab === "project") return;
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "account") {
        params.set("tab", "account");
      } else {
        params.delete("tab");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [hasProject, pathname, router, searchParams]
  );

  const forgotReturnPath = useMemo(() => {
    const params = new URLSearchParams();
    params.set("tab", "account");
    if (projectId) {
      return `/dashboard/projects/${projectId}/settings?${params.toString()}`;
    }
    return `/dashboard/settings?${params.toString()}`;
  }, [projectId]);

  if (!isRenovationDataReady) {
    return <DashboardPageSkeleton />;
  }

  if (hasProject && !project) {
    return (
      <p className="text-sm text-renovation-concrete">
        {t("projectSettings.notFound")}{" "}
        <Link href="/dashboard/projects" className="underline">
          {t("nav.projects")}
        </Link>
      </p>
    );
  }

  return (
    <div className={`mx-auto max-w-2xl space-y-6 ${SETTINGS_FORM_FIELD_CLASS}`}>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("nav.tabs.settings")}</h1>
        {project ? (
          <p className="mt-1 text-sm leading-relaxed text-renovation-concrete">{project.name}</p>
        ) : (
          <p className="mt-1 text-sm leading-relaxed text-renovation-concrete">{t("settings.subtitle")}</p>
        )}
      </header>

      <SettingsSubtabNav
        activeTab={activeTab}
        onTabChange={setTab}
        showProjectTab={hasProject}
      />

      {!hasProject ? (
        <p className="text-sm text-renovation-concrete">{t("projectSettings.accountOnlyHint")}</p>
      ) : null}

      {activeTab === "project" && hasProject && projectId ? (
        <ProjectSettingsForm projectId={projectId} />
      ) : null}

      {activeTab === "account" ? (
        <AccountSettingsContent forgotReturnPath={forgotReturnPath} />
      ) : null}
    </div>
  );
}
