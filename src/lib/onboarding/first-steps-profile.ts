import { supabase } from "@/lib/supabase/client";

type UserProfileRow = {
  user_id: string;
  first_steps_onboarding_completed_at: string | null;
};

export async function fetchFirstStepsOnboardingCompleted(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("first_steps_onboarding_completed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("fetchFirstStepsOnboardingCompleted failed", error.message);
    return false;
  }

  const row = data as Pick<UserProfileRow, "first_steps_onboarding_completed_at"> | null;
  return Boolean(row?.first_steps_onboarding_completed_at);
}

export async function persistFirstStepsOnboardingCompleted(userId: string): Promise<boolean> {
  const completedAt = new Date().toISOString();
  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      first_steps_onboarding_completed_at: completedAt,
      updated_at: completedAt,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("persistFirstStepsOnboardingCompleted failed", error.message);
    return false;
  }

  return true;
}
