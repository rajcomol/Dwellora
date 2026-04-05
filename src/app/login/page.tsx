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
    <div className="login-auth-glass rounded-[2rem] p-8 sm:p-10" aria-busy="true">
      <div className="mx-auto h-9 w-48 animate-pulse rounded-md bg-white/10" />
      <div className="mt-4 h-4 w-full max-w-sm animate-pulse rounded bg-white/10" />
      <div className="mt-8 space-y-6">
        <div className="h-10 w-full animate-pulse rounded-none border-b border-amber-200/15 bg-transparent" />
        <div className="h-10 w-full animate-pulse rounded-none border-b border-amber-200/15 bg-transparent" />
        <div className="h-12 w-full animate-pulse rounded-full bg-amber-200/15" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <LoginScreenChrome>
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </LoginScreenChrome>
  );
}
