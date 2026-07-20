import { createClient } from "@supabase/supabase-js";

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

async function findAuthUserId(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  const normalized = email.toLowerCase();
  // Pagineer — staging kan meer dan 1000 users hebben.
  for (let page = 1; page <= 20; page += 1) {
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (listError) {
      console.warn("resetFirstStepsOnboardingForTestUser listUsers failed", listError.message);
      return null;
    }
    const match = listed.users.find((entry) => entry.email?.toLowerCase() === normalized);
    if (match) return match.id;
    if (listed.users.length < 1000) break;
  }
  return null;
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

  const userId = await findAuthUserId(admin, email);
  if (!userId) {
    console.warn("resetFirstStepsOnboardingForTestUser: test user not found", email);
    return false;
  }

  // Explict UPDATE i.p.v. upsert: PostgREST/upsert kan null-kolommen soms overslaan,
  // waardoor first_steps_onboarding_completed_at blijven staan.
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await admin
    .from("user_profiles")
    .update({
      first_steps_onboarding_completed_at: null,
      updated_at: now,
    })
    .eq("user_id", userId)
    .select("user_id");

  if (updateError) {
    console.warn("resetFirstStepsOnboardingForTestUser update failed", updateError.message);
    return false;
  }

  if (!updated || updated.length === 0) {
    const { error: insertError } = await admin.from("user_profiles").insert({
      user_id: userId,
      first_steps_onboarding_completed_at: null,
      updated_at: now,
    });
    if (insertError) {
      console.warn("resetFirstStepsOnboardingForTestUser insert failed", insertError.message);
      return false;
    }
  }

  const { data: verify, error: verifyError } = await admin
    .from("user_profiles")
    .select("first_steps_onboarding_completed_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (verifyError) {
    console.warn("resetFirstStepsOnboardingForTestUser verify failed", verifyError.message);
    return false;
  }

  if (verify?.first_steps_onboarding_completed_at) {
    console.warn(
      "resetFirstStepsOnboardingForTestUser: completed_at still set after reset",
      verify.first_steps_onboarding_completed_at
    );
    return false;
  }

  return true;
}
