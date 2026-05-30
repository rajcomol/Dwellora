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
    <div aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded bg-stone-200" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-stone-200" />
      <div className="mt-7 space-y-5">
        <div className="h-[42px] w-full animate-pulse rounded-[8px] bg-stone-200" />
        <div className="h-[42px] w-full animate-pulse rounded-[8px] bg-stone-200" />
        <div className="h-[42px] w-full animate-pulse rounded-[8px] bg-stone-200" />
        <div className="h-[46px] w-full animate-pulse rounded-[8px] bg-amber-200" />
      </div>
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
