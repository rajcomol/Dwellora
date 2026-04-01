"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

/** Matches `/dashboard/projects/:uuid` and `/dashboard/projects/:uuid/planning`. */
const PROJECT_SEGMENT = /^\/dashboard\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i;

export function useProjectIdFromDashboardPath(): string | null {
  const pathname = usePathname() ?? "";
  return useMemo(() => {
    const m = pathname.match(PROJECT_SEGMENT);
    return m?.[1] ?? null;
  }, [pathname]);
}
