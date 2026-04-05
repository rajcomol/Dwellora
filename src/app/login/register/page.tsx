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
    <div className="login-auth-glass rounded-[2rem] p-8 sm:p-10" aria-busy="true">
      <div className="h-6 w-3/4 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/10" />
      <div className="mt-8 space-y-6">
        <div className="h-10 w-full animate-pulse border-b border-amber-200/15 bg-transparent" />
        <div className="h-10 w-full animate-pulse border-b border-amber-200/15 bg-transparent" />
        <div className="h-10 w-full animate-pulse border-b border-amber-200/15 bg-transparent" />
      </div>
      <div className="mt-8 h-12 w-full animate-pulse rounded-full bg-amber-200/15" />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <LoginScreenChrome>
      <Suspense fallback={<RegisterFallback />}>
        <RegisterForm />
      </Suspense>
    </LoginScreenChrome>
  );
}
