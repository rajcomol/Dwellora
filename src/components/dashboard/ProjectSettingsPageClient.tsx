"use client";

import SettingsHubPageClient from "@/components/settings/SettingsHubPageClient";
import type { ID } from "@/lib/renovation/types";

type Props = {
  projectId: ID;
  initialTab?: string | null;
};

export default function ProjectSettingsPageClient({ projectId, initialTab }: Props) {
  return <SettingsHubPageClient projectId={projectId} initialTab={initialTab} />;
}
