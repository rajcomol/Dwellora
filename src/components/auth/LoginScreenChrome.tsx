import Image from "next/image";
import type { ReactNode } from "react";
import BrandLogo from "@/components/brand/BrandLogo";

type Props = {
  children: ReactNode;
  /** Shown under the logo (e.g. tagline or short helper text). */
  belowLogo?: ReactNode;
};

export default function LoginScreenChrome({ children, belowLogo }: Props) {
  return (
    <div className="login-auth-page relative min-h-dvh overflow-hidden">
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

      <div className="relative z-10 flex min-h-dvh flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-8 sm:pb-12 sm:pt-10">
          <div className="login-hero-stagger -mt-[clamp(1rem,min(10dvh,5.5rem),5.5rem)] flex w-full flex-col items-center gap-2 sm:gap-2.5">
            <div className="flex w-full max-w-[520px] justify-center px-0">
              <BrandLogo />
            </div>

            {belowLogo ? (
              <div className="max-w-md px-1 text-center">{belowLogo}</div>
            ) : null}

            <div className="w-full max-w-[420px]">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
