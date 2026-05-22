"use client";

import Image from "next/image";
import Link from "next/link";
import AuthHeader from "@/components/dashboard/AuthHeader";
import HelpMenu from "@/components/help/HelpMenu";
import ProjectSwitcher from "@/components/layout/ProjectSwitcher";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useI18n } from "@/i18n/provider";

export default function TopBar() {
  const { t } = useI18n();
  const { selectedProject } = useSelectedProject();

  return (
    <header
      className="sticky top-0 z-50 flex h-12 items-center gap-3 border-b border-renovation-border bg-renovation-elevated px-4 dark:border-renovation-border dark:bg-renovation-elevated"
      style={{
        paddingLeft: "max(1rem, env(safe-area-inset-left))",
        paddingRight: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      <div className="hidden min-w-0 items-center gap-3 md:flex">
        <Link
          href="/dashboard"
          aria-label={t("brand.name")}
          data-tour="brand-home"
          className="flex shrink-0 items-center gap-2"
        >
          <Image src="/logo.svg" alt="RenoTasker" width={28} height={28} priority />
          <span className="hidden text-[15px] font-semibold tracking-tight text-foreground sm:block">
            RenoTasker
          </span>
        </Link>
        <ProjectSwitcher />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center md:hidden">
        <span className="truncate text-sm font-semibold text-foreground">
          {selectedProject?.name ?? t("layout.topBar.chooseProject")}
        </span>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          title={t("layout.topBar.notificationsSoon")}
          className="hidden rounded-lg p-2 text-renovation-concrete hover:bg-renovation-muted sm:inline-flex dark:hover:bg-renovation-muted"
          aria-label={t("layout.topBar.notificationsSoon")}
        >
          <span aria-hidden className="text-lg leading-none">
            🔔
          </span>
        </button>
        <HelpMenu />
        <AuthHeader />
      </div>
    </header>
  );
}
