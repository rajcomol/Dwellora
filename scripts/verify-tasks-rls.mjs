/**
 * Verify tasks SELECT works (no stack depth error) using test user from .env.local.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

function loadEnv() {
  if (!existsSync(envPath)) throw new Error("Missing .env.local");
  const map = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) map[m[1]] = m[2].trim();
  }
  return map;
}

async function main() {
  const ref = process.argv[2];
  if (!ref) {
    console.error("Usage: node scripts/verify-tasks-rls.mjs <staging|prod>");
    process.exit(1);
  }
  const env = loadEnv();
  const urls = {
    staging: "https://cgvmclxglxhbuhuovedl.supabase.co",
    prod: "https://qvansiwlykvhgfdygisu.supabase.co",
  };
  const base = urls[ref];
  if (!base) {
    console.error("Unknown ref:", ref);
    process.exit(1);
  }
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = env.TEST_USER_EMAIL;
  const password = env.TEST_USER_PASSWORD;
  if (!anon || !email || !password) {
    console.error("Need anon key + TEST_USER_EMAIL/PASSWORD in .env.local");
    process.exit(1);
  }

  const supabase = createClient(base, anon);
  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signErr) {
    console.error("Sign-in failed:", signErr.message);
    process.exit(1);
  }

  const { data, error } = await supabase.from("tasks").select("id,project_id,title").limit(5);
  if (error) {
    console.error("tasks SELECT failed:", error.message, error.details ?? "");
    process.exit(1);
  }
  console.log(`OK: tasks SELECT returned ${data?.length ?? 0} row(s) on ${ref}`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
