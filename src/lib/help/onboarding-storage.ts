import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

/** Bump when the tour content or flow changes materially (show again for existing users). */
export const ONBOARDING_TOUR_VERSION = 1;

const LS_PREFIX = "renotasker.onboarding";

type OnboardingV1 = {
  version: number;
  completedAt?: string;
  skippedAt?: string;
};

function lsKey(userId: string) {
  return `${LS_PREFIX}.v${ONBOARDING_TOUR_VERSION}.${userId}`;
}

function readLocal(userId: string): OnboardingV1 | null {
  try {
    const raw = localStorage.getItem(lsKey(userId));
    if (!raw) return null;
    const p = JSON.parse(raw) as OnboardingV1;
    return p && typeof p === "object" ? p : null;
  } catch {
    return null;
  }
}

function writeLocal(userId: string, patch: Partial<OnboardingV1>) {
  try {
    const prev = readLocal(userId) ?? { version: ONBOARDING_TOUR_VERSION };
    localStorage.setItem(
      lsKey(userId),
      JSON.stringify({
        ...prev,
        ...patch,
        version: ONBOARDING_TOUR_VERSION,
      } satisfies OnboardingV1)
    );
  } catch {
    /* ignore quota / private mode */
  }
}

function metaV1(user: User | null): OnboardingV1 | null {
  const raw = user?.user_metadata as Record<string, unknown> | undefined;
  const block = raw?.renotasker_onboarding as Record<string, unknown> | undefined;
  const v1 = block?.v1 as Record<string, unknown> | undefined;
  if (!v1 || typeof v1 !== "object") return null;
  return {
    version: typeof v1.version === "number" ? v1.version : ONBOARDING_TOUR_VERSION,
    completedAt: typeof v1.completedAt === "string" ? v1.completedAt : undefined,
    skippedAt: typeof v1.skippedAt === "string" ? v1.skippedAt : undefined,
  };
}

export function shouldAutoStartTour(user: User | null): boolean {
  if (!user?.id) return false;
  const fromMeta = metaV1(user);
  const fromLs = readLocal(user.id);
  if (fromMeta?.completedAt || fromMeta?.skippedAt) return false;
  if (fromLs?.completedAt || fromLs?.skippedAt) return false;
  return true;
}

export async function persistTourCompleted(user: User | null) {
  if (!user?.id) return;
  const iso = new Date().toISOString();
  writeLocal(user.id, { completedAt: iso, skippedAt: undefined });
  try {
    const existing = (user.user_metadata ?? {}) as Record<string, unknown>;
    const onboarding = (existing.renotasker_onboarding as Record<string, unknown> | undefined) ?? {};
    await supabase.auth.updateUser({
      data: {
        ...existing,
        renotasker_onboarding: {
          ...onboarding,
          v1: {
            ...(typeof onboarding.v1 === "object" && onboarding.v1 ? (onboarding.v1 as object) : {}),
            version: ONBOARDING_TOUR_VERSION,
            completedAt: iso,
          },
        },
      },
    });
  } catch {
    /* offline or session issues — localStorage still set */
  }
}

export async function persistTourSkipped(user: User | null) {
  if (!user?.id) return;
  const iso = new Date().toISOString();
  writeLocal(user.id, { skippedAt: iso });
  try {
    const existing = (user.user_metadata ?? {}) as Record<string, unknown>;
    const onboarding = (existing.renotasker_onboarding as Record<string, unknown> | undefined) ?? {};
    await supabase.auth.updateUser({
      data: {
        ...existing,
        renotasker_onboarding: {
          ...onboarding,
          v1: {
            ...(typeof onboarding.v1 === "object" && onboarding.v1 ? (onboarding.v1 as object) : {}),
            version: ONBOARDING_TOUR_VERSION,
            skippedAt: iso,
          },
        },
      },
    });
  } catch {
    /* ignore */
  }
}

/** Clear completion/skip so the tour can run again (local + server metadata). */
export async function resetTourProgress(user: User | null) {
  if (!user?.id) return;
  try {
    localStorage.removeItem(lsKey(user.id));
  } catch {
    /* ignore */
  }
  try {
    const existing = (user.user_metadata ?? {}) as Record<string, unknown>;
    const onboarding = { ...((existing.renotasker_onboarding as Record<string, unknown> | undefined) ?? {}) };
    delete onboarding.v1;
    await supabase.auth.updateUser({
      data: {
        ...existing,
        renotasker_onboarding: onboarding,
      },
    });
  } catch {
    /* ignore */
  }
}
