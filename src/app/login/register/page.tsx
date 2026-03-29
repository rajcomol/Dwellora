import type { Metadata } from "next";
import { Suspense } from "react";
import RegisterForm from "@/components/auth/RegisterForm";
import LoginScreenChrome from "@/components/auth/LoginScreenChrome";
import nl from "@/i18n/locales/nl.json";

export const metadata: Metadata = {
  title: nl.meta.signUpTitle,
  description: nl.meta.signUpDescription,
};

function RegisterFallback() {
  return (
    <div
      className="rounded-[2rem] border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950/85 p-8 shadow-2xl backdrop-blur-xl sm:p-10"
      aria-busy="true"
    >
      <div className="h-6 w-3/4 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/10" />
      <div className="mt-8 space-y-6">
        <div className="h-10 w-full animate-pulse border-b border-white/10 bg-transparent" />
        <div className="h-10 w-full animate-pulse border-b border-white/10 bg-transparent" />
        <div className="h-10 w-full animate-pulse border-b border-white/10 bg-transparent" />
      </div>
      <div className="mt-8 h-12 w-full animate-pulse rounded-full bg-white/15" />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <LoginScreenChrome
      belowLogo={
        <p className="text-sm font-medium leading-relaxed text-white drop-shadow-[0_1px_3px_rgb(0_0_0/0.85)] sm:text-base">
          {nl.login.tagline}
        </p>
      }
    >
      <Suspense fallback={<RegisterFallback />}>
        <RegisterForm />
      </Suspense>
    </LoginScreenChrome>
  );
}
