"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type HelpContextValue = {
  /** Increment om de rondleiding opnieuw te starten vanaf stap 1. */
  tourKick: number;
  startTour: () => void;
};

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: ReactNode }) {
  const [tourKick, setTourKick] = useState(0);

  const startTour = useCallback(() => {
    setTourKick((k) => k + 1);
  }, []);

  const value = useMemo<HelpContextValue>(
    () => ({
      tourKick,
      startTour,
    }),
    [tourKick, startTour]
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelp(): HelpContextValue {
  const ctx = useContext(HelpContext);
  if (!ctx) {
    throw new Error("useHelp must be used within HelpProvider");
  }
  return ctx;
}
