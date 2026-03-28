import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import AuthHeader from "@/components/dashboard/AuthHeader";
import DashboardShellNav from "@/components/dashboard/DashboardShellNav";
import nl from "@/i18n/locales/nl.json";

function BrandWordmark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/dwellora-logo-wordmark-v3.png"
      alt={nl.brand.name}
      width={280}
      height={64}
      className={className}
      priority
    />
  );
}

function BrandIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/dwellora-icon-d-house.png"
      alt=""
      width={40}
      height={40}
      className={className}
      priority
    />
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
            <Link
              href="/dashboard"
              className="flex flex-col gap-2 rounded-xl px-1 py-0.5 transition-opacity hover:opacity-90"
            >
              <BrandWordmark className="h-10 w-auto max-w-full object-contain object-left drop-shadow-[0_1px_2px_rgb(15_23_42/0.08)] dark:drop-shadow-[0_1px_2px_rgb(0_0_0/0.35)]" />
              <div className="text-lg font-semibold leading-tight text-renovation-steel dark:text-zinc-100">
                {nl.shell.sidebarSubtitle}
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
              <BrandIcon className="h-8 w-8 shrink-0 lg:hidden" />
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
