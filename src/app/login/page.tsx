import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";
import nl from "@/i18n/locales/nl.json";

export const metadata: Metadata = {
  title: nl.meta.loginTitle,
  description: nl.meta.loginDescription,
};

function LoginFormFallback() {
  return (
    <div
      className="rounded-2xl border border-renovation-border bg-renovation-elevated/95 p-8 shadow-renovation-card backdrop-blur-sm dark:border-renovation-border dark:bg-renovation-elevated/95"
      aria-busy="true"
    >
      <div className="mx-auto h-9 w-48 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-4 h-4 w-full max-w-sm animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
      <div className="mt-8 space-y-4">
        <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-renovation-surface text-zinc-900 dark:bg-renovation-surface dark:text-zinc-50">
      <div className="bg-renovation-app pointer-events-none absolute inset-0 opacity-90" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(201,162,39,0.14),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(212,184,74,0.1),transparent)]"
        aria-hidden
      />
      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-4 py-4 sm:px-8">
          <Link
            href="/"
            className="text-sm font-medium text-renovation-steel transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {nl.login.backToHome}
          </Link>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-4">
          <div className="mb-8 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-renovation-steel dark:text-renovation-accent">
              {nl.brand.name}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {nl.login.welcomeTitle}
            </h1>
            <p className="mt-2 max-w-md text-sm text-renovation-concrete dark:text-zinc-400">{nl.login.welcomeSubtitle}</p>
          </div>

          <div className="w-full max-w-[420px]">
            <Suspense fallback={<LoginFormFallback />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
