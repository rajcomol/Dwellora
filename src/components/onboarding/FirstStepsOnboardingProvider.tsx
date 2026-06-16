"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchFirstStepsOnboardingCompleted,
  persistFirstStepsOnboardingCompleted,
} from "@/lib/onboarding/first-steps-profile";
import { supabase } from "@/lib/supabase/client";

type FirstStepsOnboardingContextValue = {
  isProfileReady: boolean;
  isOnboardingCompleted: boolean;
  markOnboardingCompleted: () => Promise<void>;
};

const FirstStepsOnboardingContext = createContext<FirstStepsOnboardingContextValue | null>(null);

export function FirstStepsOnboardingProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isProfileReady, setIsProfileReady] = useState(false);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setIsProfileReady(false);
      setIsOnboardingCompleted(false);
      return;
    }

    let cancelled = false;
    setIsProfileReady(false);
    void fetchFirstStepsOnboardingCompleted(user.id).then((completed) => {
      if (cancelled) return;
      setIsOnboardingCompleted(completed);
      setIsProfileReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const markOnboardingCompleted = useCallback(async () => {
    if (!user?.id) return;
    setIsOnboardingCompleted(true);
    await persistFirstStepsOnboardingCompleted(user.id);
  }, [user?.id]);

  const value = useMemo<FirstStepsOnboardingContextValue>(
    () => ({
      isProfileReady,
      isOnboardingCompleted,
      markOnboardingCompleted,
    }),
    [isProfileReady, isOnboardingCompleted, markOnboardingCompleted]
  );

  return (
    <FirstStepsOnboardingContext.Provider value={value}>{children}</FirstStepsOnboardingContext.Provider>
  );
}

export function useFirstStepsOnboarding(): FirstStepsOnboardingContextValue {
  const ctx = useContext(FirstStepsOnboardingContext);
  if (!ctx) {
    throw new Error("useFirstStepsOnboarding must be used within FirstStepsOnboardingProvider");
  }
  return ctx;
}
