"use client";

import Link from "next/link";
import { HERO_IMAGE, REGISTER_HREF } from "@/components/marketing/constants";
import { useI18n } from "@/i18n/provider";

export default function MarketingFinalCta() {
  const { t } = useI18n();

  return (
    <section data-testid="marketing-final-cta" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0" aria-hidden="true">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
        />
        <div className="absolute inset-0 bg-stone-950/65" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-medium tracking-tight text-white sm:text-4xl">
          {t("marketing.finalCta.heading")}
        </h2>
        <Link
          href={REGISTER_HREF}
          data-testid="marketing-final-cta-button"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-renovation-accent px-8 py-3.5 text-base font-medium text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-renovation-steel hover:shadow-xl"
        >
          {t("marketing.finalCta.cta")}
        </Link>
      </div>
    </section>
  );
}
