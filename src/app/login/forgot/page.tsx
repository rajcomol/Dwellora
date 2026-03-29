import type { Metadata } from "next";
import { Suspense } from "react";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import LoginScreenChrome from "@/components/auth/LoginScreenChrome";
import nl from "@/i18n/locales/nl.json";

export const metadata: Metadata = {
  title: nl.meta.forgotPasswordTitle,
  description: nl.meta.forgotPasswordDescription,
};

function ForgotFallback() {
  return (
    <div
      className="rounded-[2rem] border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950/85 p-8 shadow-2xl backdrop-blur-xl sm:p-10"
      aria-busy="true"
    >
      <div className="h-6 w-3/4 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/10" />
      <div className="mt-8 h-10 w-full animate-pulse border-b border-white/10 bg-transparent" />
      <div className="mt-8 h-12 w-full animate-pulse rounded-full bg-white/15" />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <LoginScreenChrome
      belowLogo={
        <p className="text-sm text-white/95 drop-shadow-[0_1px_3px_rgb(0_0_0/0.85)]">{nl.login.forgotLead}</p>
      }
    >
      <Suspense fallback={<ForgotFallback />}>
        <ForgotPasswordForm />
      </Suspense>
    </LoginScreenChrome>
  );
}
