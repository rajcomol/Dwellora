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
    <div className="login-auth-glass rounded-[2rem] p-8 sm:p-10" aria-busy="true">
      <div className="h-6 w-3/4 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-white/10" />
      <div className="mt-8 h-10 w-full animate-pulse border-b border-amber-200/15 bg-transparent" />
      <div className="mt-8 h-12 w-full animate-pulse rounded-full bg-amber-200/15" />
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <LoginScreenChrome
      belowLogo={
        <p className="text-sm leading-relaxed tracking-wide text-white/90 drop-shadow-[0_2px_14px_rgb(8_6_4/0.55)]">
          {nl.login.forgotLead}
        </p>
      }
    >
      <Suspense fallback={<ForgotFallback />}>
        <ForgotPasswordForm />
      </Suspense>
    </LoginScreenChrome>
  );
}
