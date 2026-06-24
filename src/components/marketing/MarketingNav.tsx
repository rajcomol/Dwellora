"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import MarketingLogoMark from "@/components/marketing/MarketingLogoMark";
import { MARKETING_SECTION_IDS, REGISTER_HREF } from "@/components/marketing/constants";

const floatingSurface =
  "rounded-full border border-white/25 bg-stone-950/50 shadow-lg shadow-stone-950/25 backdrop-blur-md";

export default function MarketingNav() {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const navLinks = [
    { href: `#${MARKETING_SECTION_IDS.features}`, label: t("marketing.nav.features") },
    { href: `#${MARKETING_SECTION_IDS.pricing}`, label: t("marketing.nav.pricing") },
  ];

  const compact = scrolled;

  return (
    <header
      data-testid="marketing-nav"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 transition-all duration-300 sm:px-5 sm:pt-4"
    >
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-3">
        <Link
          href="/"
          data-testid="marketing-nav-brand"
          className={[
            "pointer-events-auto flex min-w-0 items-center gap-2.5 text-white transition-all duration-300",
            floatingSurface,
            compact ? "px-3 py-1.5" : "px-4 py-2",
          ].join(" ")}
        >
          <MarketingLogoMark className={compact ? "h-7 w-7" : "h-8 w-8"} />
          <span className="min-w-0">
            <span
              className={[
                "block font-medium tracking-tight drop-shadow-sm",
                compact ? "text-base" : "text-lg",
              ].join(" ")}
            >
              {t("brand.name")}
            </span>
            {!compact ? (
              <span className="hidden truncate text-xs font-normal text-white/75 drop-shadow-sm sm:block">
                {t("marketing.nav.tagline")}
              </span>
            ) : null}
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <nav
            className={[
              "pointer-events-auto hidden items-center gap-1 lg:flex",
              floatingSurface,
              compact ? "px-1.5 py-1" : "px-2 py-1.5",
            ].join(" ")}
            aria-label="Hoofdnavigatie"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-white/90 drop-shadow-sm transition-colors hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <Link
            href="/login"
            data-testid="marketing-nav-login"
            className={[
              "pointer-events-auto inline-flex items-center justify-center font-medium text-white drop-shadow-sm transition-all duration-300 hover:bg-white/15",
              floatingSurface,
              compact ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
            ].join(" ")}
          >
            {t("marketing.nav.login")}
          </Link>

          <Link
            href={REGISTER_HREF}
            data-testid="marketing-nav-cta"
            className={[
              "pointer-events-auto inline-flex items-center justify-center rounded-full bg-renovation-accent font-medium text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-renovation-steel hover:shadow-lg",
              compact ? "px-3.5 py-1.5 text-sm" : "px-4 py-2 text-sm",
            ].join(" ")}
          >
            {t("marketing.nav.getStarted")}
          </Link>

          <button
            type="button"
            className={[
              "pointer-events-auto inline-flex min-h-10 min-w-10 items-center justify-center text-white lg:hidden",
              floatingSurface,
            ].join(" ")}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t("marketing.nav.menuClose") : t("marketing.nav.menuOpen")}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="sr-only">{menuOpen ? t("marketing.nav.menuClose") : t("marketing.nav.menuOpen")}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          className={[
            "pointer-events-auto mx-auto mt-2 max-w-6xl px-0 lg:hidden",
            floatingSurface,
            "rounded-2xl px-4 py-4",
          ].join(" ")}
        >
          <nav className="flex flex-col gap-2" aria-label="Mobiel menu">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="min-h-10 rounded-xl px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login"
              data-testid="marketing-nav-login-mobile"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white"
              onClick={() => setMenuOpen(false)}
            >
              {t("marketing.nav.login")}
            </Link>
            <Link
              href={REGISTER_HREF}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-renovation-accent px-4 py-2 text-sm font-medium text-white"
              onClick={() => setMenuOpen(false)}
            >
              {t("marketing.nav.getStarted")}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
