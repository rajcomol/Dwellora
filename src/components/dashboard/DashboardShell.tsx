import Link from "next/link";
import type { ReactNode } from "react";
import AuthHeader from "@/components/dashboard/AuthHeader";
import DashboardShellNav from "@/components/dashboard/DashboardShellNav";
import nl from "@/i18n/locales/nl.json";

function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="4" y="22" width="14" height="14" rx="2" fill="var(--renovation-accent)" fillOpacity={0.92} />
      <rect x="22" y="10" width="14" height="26" rx="2" fill="var(--renovation-steel)" fillOpacity={0.9} />
      <path
        d="M4 18 L18 4 L32 4 L32 8 L20 8 L4 22 Z"
        fill="var(--renovation-steel)"
        fillOpacity={0.65}
      />
    </svg>
  );
}

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
            <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-1 py-0.5 transition-opacity hover:opacity-90">
              <BrandMark className="h-9 w-9 shrink-0" />
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-renovation-concrete">{nl.brand.name}</div>
                <div className="text-lg font-semibold leading-tight text-renovation-steel dark:text-zinc-100">{nl.shell.sidebarSubtitle}</div>
              </div>
            </Link>
            <DashboardShellNav />
            <div className="mt-auto flex flex-col gap-2 pt-6 text-xs text-renovation-concrete">
              <Link href="/privacy" className="font-medium text-renovation-steel hover:underline dark:text-zinc-300">
                {nl.shell.privacyLink}
              </Link>
              <Link href="/login" className="font-medium text-renovation-steel hover:underline dark:text-zinc-300">
                {nl.nav.account}
              </Link>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-renovation-border bg-renovation-elevated px-4 py-3 dark:border-renovation-border dark:bg-renovation-elevated">
            <div className="flex items-center gap-3">
              <BrandMark className="h-8 w-8 shrink-0 lg:hidden" />
              <div className="text-sm font-semibold text-renovation-steel dark:text-zinc-100">{nl.shell.headerTitle}</div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <AuthHeader />
            </div>
          </header>

          <main className="bg-renovation-app flex-1 px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
