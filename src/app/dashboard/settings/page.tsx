import type { Metadata } from "next";
import SettingsPageClient from "@/components/settings/SettingsPageClient";
import nl from "@/i18n/locales/nl.json";

export const metadata: Metadata = {
  title: `${nl.nav.settings} | ${nl.brand.name}`,
  description: nl.settings.subtitle,
};

export default function DashboardSettingsPage() {
  return <SettingsPageClient />;
}
