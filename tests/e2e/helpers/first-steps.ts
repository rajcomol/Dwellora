import { createClient } from "@supabase/supabase-js";

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

export async function resetFirstStepsOnboardingForTestUser(email: string): Promise<boolean> {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey || !email.trim()) {
    return false;
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.warn("resetFirstStepsOnboardingForTestUser listUsers failed", listError.message);
    return false;
  }

  const user = listed.users.find((entry) => entry.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    return false;
  }

  const { error } = await admin.from("user_profiles").upsert(
    {
      user_id: user.id,
      first_steps_onboarding_completed_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.warn("resetFirstStepsOnboardingForTestUser upsert failed", error.message);
    return false;
  }

  return true;
}
