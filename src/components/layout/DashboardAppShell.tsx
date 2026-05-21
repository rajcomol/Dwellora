"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import BottomNav from "@/components/layout/BottomNav";
import TabNav from "@/components/layout/TabNav";
import TopBar from "@/components/layout/TopBar";
import ProjectSwitcher from "@/components/layout/ProjectSwitcher";
import { useI18n } from "@/i18n/provider";

export default function DashboardAppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-renovation-surface text-zinc-900 dark:text-zinc-50">
      <TopBar />
      <TabNav />
      <div className="border-b border-renovation-border px-4 py-2 md:hidden dark:border-renovation-border">
        <ProjectSwitcher compact />
      </div>
      <main
        data-tour="dashboard-main"
        className="min-w-0 flex-1 bg-renovation-app px-4 py-6 pb-24 sm:px-6 md:pb-6"
      >
        {children}
      </main>
      <BottomNav />
      <footer className="hidden border-t border-renovation-border px-6 py-3 text-xs text-renovation-concrete md:block dark:border-renovation-border">
        <Link href="/privacy" className="font-medium hover:underline">
          {t("shell.privacyLink")}
        </Link>
        {" · "}
        <Link href="/dashboard/help" className="font-medium hover:underline">
          {t("help.sidebarLink")}
        </Link>
      </footer>
    </div>
  );
}
