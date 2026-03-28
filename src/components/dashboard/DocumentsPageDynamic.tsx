"use client";

import dynamic from "next/dynamic";
import HeavyRouteFallback from "@/components/dashboard/HeavyRouteFallback";

const DocumentsPageClient = dynamic(() => import("@/components/documents/DocumentsPageClient"), {
  ssr: false,
  loading: () => <HeavyRouteFallback />,
});

export default function DocumentsPageDynamic() {
  return <DocumentsPageClient />;
}
