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

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-10 sm:pt-14">
          <div className="mb-6 flex flex-col items-center">
            <Image
              src="/brand/dwellora-logo-wordmark-v3.png"
              alt={nl.brand.name}
              width={280}
              height={64}
              priority
              className="h-auto w-[min(72vw,280px)] max-w-full"
            />
            {belowLogo ? <div className="mt-5 max-w-md text-center">{belowLogo}</div> : null}
          </div>

          <div className="w-full max-w-[420px] motion-safe-fade-in">{children}</div>
        </div>
      </div>
    </div>
  );
}
