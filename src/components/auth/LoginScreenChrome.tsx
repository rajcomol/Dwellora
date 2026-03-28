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
      {/* Renovatiefoto — zacht geblurd als basislaag */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image
          src="/images/login-renovation-hero.webp"
          alt=""
          fill
          priority
          className="object-cover object-center blur-[2px]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-slate-950/55" aria-hidden />
      </div>

      {/* AI-stijl: mesh raster + kleurverloop over de foto */}
      <div className="login-auth-ai-overlay pointer-events-none absolute inset-0 z-[1]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
        <div className="absolute -left-1/4 top-0 h-[min(70vh,520px)] w-[min(90vw,640px)] rounded-full bg-fuchsia-500/20 blur-[100px]" />
        <div className="absolute -right-1/4 top-1/3 h-[min(60vh,480px)] w-[min(85vw,560px)] rounded-full bg-cyan-500/15 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-[min(50vh,400px)] w-[min(70vw,480px)] rounded-full bg-violet-600/15 blur-[90px]" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_85%_55%_at_50%_15%,rgb(30_27_75/0.45),transparent_60%)]"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-10 sm:pt-14">
          <div className="mb-6 flex flex-col items-center">
            {/* Lichte glas-pill zodat het wordmark op elke achtergrond leesbaar blijft */}
            <div className="rounded-2xl bg-white/95 px-5 py-3 shadow-lg shadow-black/25 ring-1 ring-black/5 dark:bg-white/95">
              <Image
                src="/brand/dwellora-logo-wordmark-v3.png"
                alt={nl.brand.name}
                width={280}
                height={64}
                priority
                className="h-auto w-[min(72vw,280px)] max-w-full"
              />
            </div>
            {belowLogo ? <div className="mt-5 max-w-md text-center">{belowLogo}</div> : null}
          </div>

          <div className="w-full max-w-[420px] motion-safe-fade-in">{children}</div>
        </div>
      </div>
    </div>
  );
}
