import Link from "next/link";
import type { ReactNode } from "react";
import BrandLogo from "@/components/brand/BrandLogo";
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
            className="relative flex min-h-[3.25rem] items-center gap-3 border-b border-renovation-border bg-renovation-elevated px-4 py-3 dark:border-renovation-border dark:bg-renovation-elevated max-lg:sticky max-lg:top-0 max-lg:z-[45] max-lg:border-renovation-border/80 max-lg:bg-renovation-elevated/85 max-lg:backdrop-blur-md dark:max-lg:bg-renovation-elevated/80 lg:bg-renovation-elevated lg:backdrop-blur-none"
            style={{
              paddingTop: "max(0.75rem, env(safe-area-inset-top))",
              paddingLeft: "max(1rem, env(safe-area-inset-left))",
              paddingRight: "max(1rem, env(safe-area-inset-right))",
            }}
          >
            <div className="relative z-10 flex min-w-0 flex-1 items-center justify-start">
              <DashboardMobileNav />
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-center">
              <Link
                href="/dashboard"
                aria-label={nl.brand.name}
                data-tour="brand-home"
                className="pointer-events-auto min-w-0 max-w-[min(100%,calc(100vw-7rem))] shrink transition-opacity hover:opacity-90 sm:max-w-[min(100%,calc(100vw-9rem))] lg:max-w-[min(100%,calc(100vw-14rem))]"
              >
                <BrandLogo size="header" />
              </Link>
            </div>
            <div className="relative z-10 flex min-w-0 flex-1 items-center justify-end gap-2 text-sm">
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
