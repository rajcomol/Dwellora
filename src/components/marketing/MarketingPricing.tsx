import Link from "next/link";
import Card from "@/components/ui/Card";
import nl from "@/i18n/locales/nl.json";
import { MARKETING_SECTION_IDS, REGISTER_HREF } from "@/components/marketing/constants";

/** TODO: prijzen — vervang placeholder door echte maandelijkse/jaarlijkse PricingCards. */
type PricingCardProps = {
  title: string;
  price?: string;
  description?: string;
  highlighted?: boolean;
};

function PricingCard({ title, price, description, highlighted = false }: PricingCardProps) {
  return (
    <Card
      className={[
        "flex flex-col gap-3 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-renovation-card",
        highlighted ? "border-renovation-accent/40 ring-1 ring-renovation-accent/20" : "",
      ].join(" ")}
    >
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      {price ? <p className="text-3xl font-medium tracking-tight text-foreground">{price}</p> : null}
      {description ? <p className="text-sm leading-relaxed text-renovation-concrete">{description}</p> : null}
    </Card>
  );
}

export default function MarketingPricing() {
  const copy = nl.marketing.pricing;

  return (
    <section
      id={MARKETING_SECTION_IDS.pricing}
      data-testid="marketing-pricing"
      className="bg-background py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">{copy.heading}</h2>
        <p className="mt-4 text-lg text-renovation-concrete">{copy.subtitle}</p>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <Card
            data-testid="marketing-pricing-placeholder"
            className="lg:col-span-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-renovation-card"
          >
            <p className="text-base leading-relaxed text-renovation-concrete">{copy.placeholder}</p>
            <Link
              href={REGISTER_HREF}
              data-testid="marketing-pricing-cta"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-renovation-accent px-5 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-renovation-steel hover:shadow-md"
            >
              {copy.cta}
            </Link>
          </Card>

          {/* TODO: prijzen — onderstaande kaarten invullen zodra plannen bekend zijn. */}
          <PricingCard title={copy.monthly} />
          <PricingCard title={copy.yearly} highlighted />
        </div>
      </div>
    </section>
  );
}
