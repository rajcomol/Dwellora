"use client";

import SettingsHubPageClient from "@/components/settings/SettingsHubPageClient";

type Props = {
  initialTab?: string | null;
};

export default function SettingsPageClient({ initialTab }: Props) {
  return <SettingsHubPageClient initialTab={initialTab ?? "account"} />;
}
