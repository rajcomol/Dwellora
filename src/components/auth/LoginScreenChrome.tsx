import Image from "next/image";
import type { ReactNode } from "react";
import BrandLogoPill from "@/components/brand/BrandLogoPill";

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
              <BrandLogoPill />
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
