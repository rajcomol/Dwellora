"use client";

import { useJoyride, EVENTS, STATUS, type Styles } from "react-joyride";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { buildDashboardTourSteps } from "@/lib/help/tour-steps";
import { persistTourCompleted, persistTourSkipped } from "@/lib/help/onboarding-storage";
import { supabase } from "@/lib/supabase/client";
import { useHelp } from "@/components/help/HelpProvider";

const isDev = process.env.NODE_ENV === "development";

/** Na sluiten help-menu: iets langere delay dan `0` zodat body/layout stabiel zijn. */
const MANUAL_TOUR_START_MS = 50;

export default function OnboardingTourClient() {
  const { t } = useI18n();
  const { tourKick } = useHelp();

  const [user, setUser] = useState<User | null>(null);
  const [run, setRun] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const steps = useMemo(() => buildDashboardTourSteps({ t }), [t]);

  const joyrideOptions = useMemo(
    () => ({
      zIndex: 10070,
      showProgress: true,
      skipBeacon: true,
      textColor: "#0f172a",
      backgroundColor: "#ffffff",
      primaryColor: "#0e7490",
      overlayColor: "rgba(0, 0, 0, 0.5)",
    }),
    []
  );

  const joyrideStyles = useMemo<Partial<Styles>>(
    () => ({
      tooltip: {
        backgroundColor: "#ffffff",
        color: "#0f172a",
      },
      tooltipContainer: { color: "#0f172a" },
      tooltipTitle: { color: "#0f172a" },
      tooltipContent: { color: "#0f172a" },
      buttonSkip: { color: "#0f172a" },
      buttonClose: { color: "#64748b" },
    }),
    []
  );

  const joyrideLocale = useMemo(
    () => ({
      back: t("onboarding.joyrideBack"),
      close: t("onboarding.joyrideClose"),
      last: t("onboarding.joyrideLast"),
      next: t("onboarding.joyrideNext"),
      skip: t("onboarding.joyrideSkip"),
    }),
    [t]
  );

  const onTourEvent = useCallback(
    async (event: { type: string; status: string }) => {
      if (event.type !== EVENTS.TOUR_END) return;
      setRun(false);
      if (event.status === STATUS.SKIPPED) {
        await persistTourSkipped(user);
        return;
      }
      if (event.status === STATUS.FINISHED) {
        await persistTourCompleted(user);
      }
    },
    [user]
  );

  const handleJoyrideEvent = useCallback(
    (event: { type: string; status: string }) => {
      if (isDev) {
        if (event.type === EVENTS.ERROR || event.type === EVENTS.TARGET_NOT_FOUND) {
          console.warn("[onboarding tour]", event.type, event);
        }
      }
      void onTourEvent({ type: event.type, status: event.status });
    },
    [onTourEvent]
  );

  const { Tour, failures } = useJoyride({
    steps,
    run,
    continuous: true,
    scrollToFirstStep: false,
    debug: isDev,
    options: joyrideOptions,
    styles: joyrideStyles,
    locale: joyrideLocale,
    onEvent: handleJoyrideEvent,
  });

  useEffect(() => {
    if (!isDev || failures.length === 0) return;
    console.warn("[onboarding tour] failures", failures);
  }, [failures]);

  /** Alleen handmatig: Help → "Start de rondleiding" of eerste-stappen "Ja, laat maar zien". */
  useEffect(() => {
    if (tourKick === 0) return;
    let cancelled = false;
    setRun(false);
    const id = window.setTimeout(() => {
      if (cancelled) return;
      setRun(true);
    }, MANUAL_TOUR_START_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [tourKick]);

  return Tour;
}
