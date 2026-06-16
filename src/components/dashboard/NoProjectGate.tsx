"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { isPathAllowedWithoutProjects } from "@/lib/dashboard/no-project-gate";

export default function NoProjectGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { projects, isRenovationDataReady } = useRenovation();

  const needsGate = isRenovationDataReady && projects.length === 0;
  const allowed = isPathAllowedWithoutProjects(pathname);

  useEffect(() => {
    if (!needsGate || allowed) return;
    router.replace("/dashboard");
  }, [needsGate, allowed, router]);

  if (needsGate && !allowed) {
    return null;
  }

  return children;
}
