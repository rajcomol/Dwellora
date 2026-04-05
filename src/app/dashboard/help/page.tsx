import type { Metadata } from "next";
import { Suspense } from "react";
import HelpCenterClient from "@/components/help/HelpCenterClient";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import nl from "@/i18n/locales/nl.json";

export const metadata: Metadata = {
  title: `${nl.help.pageTitle} | ${nl.brand.name}`,
  description: nl.help.pageSubtitle,
};

export default function DashboardHelpPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <HelpCenterClient />
    </Suspense>
  );
}
