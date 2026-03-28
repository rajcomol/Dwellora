import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";
import LoginScreenChrome from "@/components/auth/LoginScreenChrome";
import nl from "@/i18n/locales/nl.json";

export const metadata: Metadata = {
  title: nl.meta.loginTitle,
  description: nl.meta.loginDescription,
};

function LoginFormFallback() {
  return (
    <div
      className="rounded-[2rem] border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950/85 p-8 shadow-2xl backdrop-blur-xl dark:from-zinc-900/80 dark:to-zinc-950/85 sm:p-10"
      aria-busy="true"
    >
      <div className="mx-auto h-9 w-48 animate-pulse rounded-md bg-white/10" />
      <div className="mt-4 h-4 w-full max-w-sm animate-pulse rounded bg-white/10" />
      <div className="mt-8 space-y-6">
        <div className="h-10 w-full animate-pulse rounded-none border-b border-white/10 bg-transparent" />
        <div className="h-10 w-full animate-pulse rounded-none border-b border-white/10 bg-transparent" />
        <div className="h-12 w-full animate-pulse rounded-full bg-white/15" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <LoginScreenChrome
      belowLogo={
        <p className="text-sm font-medium leading-relaxed text-black sm:text-base">{nl.login.tagline}</p>
      }
    >
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </LoginScreenChrome>
  );
}
