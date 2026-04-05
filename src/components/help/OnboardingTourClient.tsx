"use client";

import { useJoyride, EVENTS, STATUS, type Styles } from "react-joyride";
import type { User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import { buildDashboardTourSteps } from "@/lib/help/tour-steps";
import {
  persistTourCompleted,
  persistTourSkipped,
  shouldAutoStartTour,
} from "@/lib/help/onboarding-storage";
import { supabase } from "@/lib/supabase/client";
import { useHelp } from "@/components/help/HelpProvider";

const isDev = process.env.NODE_ENV === "development";

/** Na sluiten help-menu: iets langere delay dan `0` zodat body/layout stabiel zijn. */
const MANUAL_TOUR_START_MS = 50;

export default function OnboardingTourClient() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  /** Actueel pad voor tour-hooks; alleen in effect bijgewerkt (stabiele `steps` voor react-joyride). */
  const getPathnameRef = useRef<() => string>(() => pathname);
  useEffect(() => {
    getPathnameRef.current = () => pathname;
  }, [pathname]);

  const { isRenovationDataReady } = useRenovation();
  const { tourKick } = useHelp();

  const [user, setUser] = useState<User | null>(null);
  const [run, setRun] = useState(false);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /* getPathname reads the ref only from joyride step hooks, not during React render; keeps `steps` stable across navigations. */
  /* eslint-disable react-hooks/refs -- closure passed to react-joyride, not invoked during render */
  const steps = useMemo(
    () =>
      buildDashboardTourSteps({
        t,
        router,
        getPathname: () => getPathnameRef.current(),
      }),
    [t, router]
  );
  /* eslint-enable react-hooks/refs */

  const joyrideOptions = useMemo(
    () => ({
      zIndex: 10070,
      showProgress: true,
      /**
       * Zonder dit verbergt TourRenderer de overlay bij `ACTIONS.START` tot de beacon klaar is
       * (`hideOverlay` in react-joyride TourRenderer). Tegelijk rendert `Step` pas als
       * lifecycle !== INIT — daardoor zie je kort scrollen en daarna geen UI.
       */
      skipBeacon: true,
      /** Expliciet; anders kan titel/tekst in dark mode `color` van `body` (licht) erven op witte tooltip. */
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

  const autoRunDoneRef = useRef(false);

  const { Tour, failures } = useJoyride({
    steps,
    run,
    continuous: true,
    /** Eerste stap: scroll kan floater/target uit sync halen met vaste header/layout. */
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

  /**
   * Handmatige start: `usePropSync` ziet alleen een echte wijziging van `run`. Eerst `false`, dan `true`.
   * Korte delay na help-menu + joyride `stop`/`start` in aparte macrotask.
   */
  useEffect(() => {
    if (tourKick === 0) return;
    autoRunDoneRef.current = true;
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
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

  /** Automatisch starten bij eerste bezoek aan het dashboard (als tour nog niet afgerond). */
  useEffect(() => {
    if (!isRenovationDataReady || !user) return;
    const p = pathname.replace(/\/$/, "") || "/";
    if (p !== "/dashboard") return;
    if (!shouldAutoStartTour(user)) return;
    if (autoRunDoneRef.current) return;
    if (autoTimerRef.current) return;
    autoTimerRef.current = setTimeout(() => {
      autoTimerRef.current = null;
      autoRunDoneRef.current = true;
      setRun(true);
    }, 900);
    return () => {
      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [isRenovationDataReady, user, pathname]);

  return Tour;
}
