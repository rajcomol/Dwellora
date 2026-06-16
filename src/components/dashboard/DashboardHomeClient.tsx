"use client";

import DashboardInsightsClient from "@/components/dashboard/DashboardInsightsClient";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import WelcomeNoProjectClient from "@/components/dashboard/WelcomeNoProjectClient";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";

export default function DashboardHomeClient() {
  const { projects, isRenovationDataReady } = useRenovation();

  if (!isRenovationDataReady) {
    return <DashboardPageSkeleton />;
  }

  if (projects.length === 0) {
    return <WelcomeNoProjectClient />;
  }

  return <DashboardInsightsClient />;
}
