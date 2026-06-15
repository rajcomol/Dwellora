import type { ReactNode } from "react";
import nl from "@/i18n/locales/nl.json";

type Props = {
  children: ReactNode;
};

/** Amber huis + witte checkmark — merkmark voor het inlogscherm. */
function AuthLogoMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M5 14.2 16 5l11 9.2V26a1.5 1.5 0 0 1-1.5 1.5h-19A1.5 1.5 0 0 1 5 26V14.2Z"
        fill="#d97706"
      />
      <path
        d="m11 17 3.4 3.4L21 14"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const pills = [nl.login.pillTasks, nl.login.pillBudget, nl.login.pillRooms, nl.login.pillSfeerbeeld];

export default function LoginScreenChrome({ children }: Props) {
  return (
    <div className="relative flex min-h-dvh">
      {/* Linkerkant: foto met overlay (verborgen op mobiel) */}
      <aside
        data-testid="auth-hero"
        className="relative hidden w-3/5 overflow-hidden md:block"
        style={{
          backgroundImage: "url('/images/login-renovation-hero.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(8,5,2,0.1) 0%, rgba(8,5,2,0.68) 100%)",
          }}
          aria-hidden
        />

        {/* Logo linksboven */}
        <div className="absolute left-7 top-7 flex items-center gap-2.5 text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
          <AuthLogoMark />
          <span style={{ fontSize: "18px", fontWeight: 500, letterSpacing: "-0.01em" }}>RenoTasker</span>
        </div>

        {/* Tekst + feature pills linksonder */}
        <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10 lg:p-12">
          <h2
            className="text-white"
            style={{ fontSize: "2.5rem", fontWeight: 500, lineHeight: 1.1 }}
          >
            {nl.login.heroHeading}
          </h2>
          <p
            className="mt-3 max-w-md"
            style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)" }}
          >
            Van sleuteloverdracht tot droomhuis — jij behoudt het overzicht.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {pills.map((label) => (
              <span
                key={label}
                className="text-xs font-medium text-white"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "99px",
                  padding: "6px 14px",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* Rechterkant: clean formulier op warme beige achtergrond, verticaal gecentreerd */}
      <main className="flex min-h-dvh w-full items-center justify-center bg-[#fafaf7] px-6 py-12 md:w-2/5">
        <div className="w-full max-w-[320px]">{children}</div>
      </main>
    </div>
  );
}
