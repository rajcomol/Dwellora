import Image from "next/image";
import type { ReactNode } from "react";
import nl from "@/i18n/locales/nl.json";

type Props = {
  children: ReactNode;
  /** Shown under the logo (e.g. tagline or short helper text). */
  belowLogo?: ReactNode;
};

export default function LoginScreenChrome({ children, belowLogo }: Props) {
  return (
    <div className="login-auth-page relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src="/images/login-renovation-hero.webp"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>
      {/* Sluier + subtiel patroon: diepte zoals referentie-banner */}
      <div className="login-auth-veil pointer-events-none absolute inset-0 z-[1]" aria-hidden />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-8 sm:pb-12 sm:pt-10">
          <div className="flex w-full max-w-[420px] flex-col items-stretch gap-3 sm:gap-4">
            <div className="flex justify-center px-1">
              <div className="glass-card inline-flex max-w-full items-center justify-center rounded-full px-6 py-3.5 sm:px-8 sm:py-4">
                <div className="flex max-w-[min(92vw,280px)] items-center gap-2.5 whitespace-nowrap text-white sm:gap-3">
                  <svg
                    className="h-9 w-9 shrink-0 sm:h-10 sm:w-10"
                    viewBox="18 4 16 15"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M18 12 L26 4 L34 12 H18 Z" />
                    <rect x="20" y="12" width="12" height="7" rx="0.5" />
                  </svg>
                  <span className="text-[1.625rem] font-bold leading-none tracking-tight sm:text-[1.7rem]">
                    {nl.brand.name}
                  </span>
                </div>
              </div>
            </div>

            {belowLogo ? (
              <div className="max-w-md px-1 text-center">{belowLogo}</div>
            ) : null}

            <div className="motion-safe-fade-in w-full">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
