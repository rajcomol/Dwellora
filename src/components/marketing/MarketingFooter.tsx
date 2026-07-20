import Link from "next/link";
import MarketingLogoMark from "@/components/marketing/MarketingLogoMark";
import { MARKETING_SECTION_IDS } from "@/components/marketing/constants";
import nl from "@/i18n/locales/nl.json";

export default function MarketingFooter() {
  const year = new Date().getFullYear();
  const copyright = nl.marketing.footer.copyright.replace("{year}", String(year));

  return (
    <footer data-testid="marketing-footer" className="border-t border-renovation-border bg-background py-14">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2.5">
            <MarketingLogoMark />
            <span className="text-lg font-medium tracking-tight">{nl.brand.name}</span>
          </div>
          <p className="mt-3 text-sm text-renovation-concrete">{nl.marketing.footer.tagline}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">{nl.marketing.footer.product}</h3>
          <ul className="mt-4 space-y-2 text-sm text-renovation-concrete">
            <li>
              <a href={`#${MARKETING_SECTION_IDS.features}`} className="hover:text-foreground">
                {nl.marketing.nav.features}
              </a>
            </li>
            <li>
              <a href={`#${MARKETING_SECTION_IDS.pricing}`} className="hover:text-foreground">
                {nl.marketing.nav.pricing}
              </a>
            </li>
            <li>
              <a href={`#${MARKETING_SECTION_IDS.faq}`} className="hover:text-foreground">
                {nl.marketing.nav.faq}
              </a>
            </li>
            <li>
              <Link href="/login" className="hover:text-foreground">
                {nl.marketing.nav.login}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">{nl.marketing.footer.company}</h3>
          <ul className="mt-4 space-y-2 text-sm text-renovation-concrete">
            <li>
              <a href={`#${MARKETING_SECTION_IDS.about}`} className="hover:text-foreground">
                {nl.marketing.footer.aboutUs}
              </a>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-foreground">
                {nl.marketing.footer.privacy}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">{nl.marketing.footer.contact}</h3>
          <p className="mt-4 text-sm text-renovation-concrete">
            <a href={`mailto:${nl.marketing.footer.contactEmail}`} className="hover:text-foreground">
              {nl.marketing.footer.contactEmail}
            </a>
          </p>
        </div>
      </div>

      <p className="mx-auto mt-12 max-w-6xl px-4 text-center text-xs text-renovation-concrete sm:px-6 lg:px-8">
        {copyright}
      </p>
    </footer>
  );
}
