import Card from "@/components/ui/Card";
import nl from "@/i18n/locales/nl.json";
import { MARKETING_SECTION_IDS } from "@/components/marketing/constants";

export default function MarketingAbout() {
  return (
    <section
      id={MARKETING_SECTION_IDS.about}
      data-testid="marketing-about"
      className="bg-renovation-surface py-20 sm:py-28"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_280px] lg:px-8">
        <div>
          <h2 className="text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            {nl.marketing.about.heading}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-renovation-concrete">
            {/* TODO: persoonlijk verhaal + foto oprichter */}
            {nl.marketing.about.placeholder}
          </p>
        </div>

        <Card
          aria-hidden="true"
          className="flex aspect-[4/5] items-center justify-center border-dashed bg-renovation-muted/40 p-6 text-center text-sm text-renovation-concrete"
        >
          Foto oprichter
        </Card>
      </div>
    </section>
  );
}
