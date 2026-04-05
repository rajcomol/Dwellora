import Link from "next/link";
import type { ReactNode } from "react";
import BrandLogoPill from "@/components/brand/BrandLogoPill";
import AuthHeader from "@/components/dashboard/AuthHeader";
import DashboardMobileNav from "@/components/dashboard/DashboardMobileNav";
import DashboardShellNav from "@/components/dashboard/DashboardShellNav";
import HelpMenu from "@/components/help/HelpMenu";
import nl from "@/i18n/locales/nl.json";

export default function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-renovation-surface text-zinc-900 dark:text-zinc-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-renovation-border bg-renovation-elevated shadow-sm dark:border-renovation-border dark:bg-renovation-elevated lg:block">
          <div className="flex h-full flex-col p-5">
            <DashboardShellNav />
            <div className="mt-auto flex flex-col gap-2 pt-6 text-xs text-renovation-concrete">
              <Link href="/privacy" className="font-medium text-renovation-steel hover:underline dark:text-zinc-300">
                {nl.shell.privacyLink}
              </Link>
              <Link href="/dashboard/help" className="font-medium text-renovation-steel hover:underline dark:text-zinc-300">
                {nl.help.sidebarLink}
              </Link>
              <Link href="/login" className="font-medium text-renovation-steel hover:underline dark:text-zinc-300">
                {nl.nav.account}
              </Link>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-renovation-border bg-renovation-elevated px-4 py-3 dark:border-renovation-border dark:bg-renovation-elevated"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <div className="flex min-w-0 justify-self-start">
              <DashboardMobileNav />
            </div>
            <div className="flex min-w-0 justify-center justify-self-center">
              <Link
                href="/dashboard"
                aria-label={nl.brand.name}
                data-tour="brand-home"
                className="min-w-0 shrink transition-opacity hover:opacity-90"
              >
                <BrandLogoPill size="compact" />
              </Link>
            </div>
            <div className="flex items-center justify-end justify-self-end gap-2 text-sm">
              <HelpMenu />
              <AuthHeader />
            </div>
          </header>

          <main data-tour="dashboard-main" className="min-w-0 flex-1 bg-renovation-app px-4 py-6 sm:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
