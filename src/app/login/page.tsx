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
    <div aria-busy="true">
      <div className="h-8 w-40 animate-pulse rounded bg-stone-200" />
      <div className="mt-3 h-4 w-56 animate-pulse rounded bg-stone-200" />
      <div className="mt-7 space-y-5">
        <div className="h-[42px] w-full animate-pulse rounded-[8px] bg-stone-200" />
        <div className="h-[42px] w-full animate-pulse rounded-[8px] bg-stone-200" />
        <div className="h-[46px] w-full animate-pulse rounded-[8px] bg-amber-200" />
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
