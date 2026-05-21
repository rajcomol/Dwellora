"use client";

import Clarity from "@microsoft/clarity";
import { useEffect } from "react";

/**
 * Initializes Microsoft Clarity when `NEXT_PUBLIC_CLARITY_PROJECT_ID` is set
 * (Clarity project → Settings → Overview). Omit or leave empty locally to disable.
 */
export default function MicrosoftClarity() {
  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim();
    if (!projectId) return;

    try {
      Clarity.init(projectId);
    } catch {
      /* ignore: SSR / blocked third-party */
    }
  }, []);

  return null;
}
