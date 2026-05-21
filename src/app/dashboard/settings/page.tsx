import type { Metadata } from "next";
import SettingsPageClient from "@/components/settings/SettingsPageClient";
import nl from "@/i18n/locales/nl.json";

export const metadata: Metadata = {
  title: `${nl.nav.settings} | ${nl.brand.name}`,
  description: nl.settings.subtitle,
};

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  return <SettingsPageClient initialTab={tab} />;
}
