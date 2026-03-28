import type { Metadata } from "next";
import Image from "next/image";
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
      className="rounded-2xl border border-white/20 bg-renovation-elevated/95 p-8 shadow-renovation-card backdrop-blur-sm dark:border-white/15 dark:bg-zinc-900/90"
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
    <div className="relative min-h-screen overflow-hidden">
      <Image
        src="/images/login-renovation-hero.webp"
        alt="Interieur tijdens renovatie, natuurlijk licht"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-black/45 dark:bg-black/55"
        aria-hidden
      />

      <div className="relative flex min-h-screen flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-10 sm:pt-12">
          <div className="mb-8 max-w-lg text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              {nl.brand.name}
            </h1>
            <p className="mt-4 text-lg font-semibold tracking-tight text-white/95 sm:text-xl">
              {nl.login.welcomeTitle}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/80">{nl.login.welcomeSubtitle}</p>
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
