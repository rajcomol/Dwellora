/**
 * Verifies invite email wiring for the Supabase project in .env.local.
 * Does not print secrets. Run: npm run verify:invite
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

const STAGING_REF = "cgvmclxglxhbuhuovedl";
const PROD_REF = "qvansiwlykvhgfdygisu";

function loadEnvLocal() {
  if (!existsSync(envPath)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
  const map = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    map[m[1]] = m[2].trim();
  }
  return map;
}

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    const ref = host.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}

async function main() {
  const env = loadEnvLocal();
  const base = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = env.INVITE_EDGE_SECRET;

  console.log("Invite email setup check (.env.local)\n");

  if (!base || !anon) {
    console.error("FAIL  Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  const ref = projectRefFromUrl(base);
  if (ref === STAGING_REF) {
    console.log(`OK    Supabase URL → Staging (${STAGING_REF})`);
  } else if (ref === PROD_REF) {
    console.log(`WARN  Supabase URL → PROD (${PROD_REF}) — use Staging in .env.local for local dev`);
  } else {
    console.log(`WARN  Unknown project ref in URL: ${ref ?? "(parse failed)"}`);
  }

  if (!secret) {
    console.log("FAIL  INVITE_EDGE_SECRET missing in .env.local");
    console.log("      Set the same value as Supabase Edge secret on this project.");
    console.log("      (Vercel Production needs its own copy for PROD project.)\n");
    process.exit(1);
  }

  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const gatewayKey = serviceKey || anon;
  const gatewayHeaders = { apikey: gatewayKey };
  if (gatewayKey.startsWith("eyJ")) {
    gatewayHeaders.Authorization = `Bearer ${gatewayKey}`;
  }

  const url = `${base}/functions/v1/send-project-invite`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...gatewayHeaders,
      "Content-Type": "application/json",
      "x-invite-secret": secret,
    },
    body: JSON.stringify({
      to: "verify@example.invalid",
      inviteUrl: "https://example.invalid/invite/accept?token=verify",
      expiresAtIso: new Date().toISOString(),
      projectName: "verify",
    }),
  });

  const raw = (await res.text().catch(() => "")) || res.statusText;
  let err = raw.slice(0, 200);
  try {
    const j = JSON.parse(raw);
    if (typeof j.error === "string") err = j.error.slice(0, 200);
  } catch {
    /* keep */
  }

  if (res.status === 401) {
    console.log("FAIL  Edge function: Unauthorized (401)");
    if (/INVALID_JWT|NO_AUTH_HEADER/i.test(err)) {
      console.log("      Supabase gateway / JWT verification blocks the call.");
      console.log("      Fix: disable JWT verification on send-project-invite and redeploy.");
      console.log("      See docs/EDGE_INVITE_JWT.md");
    } else {
      console.log("      INVITE_EDGE_SECRET does not match Supabase Edge secrets on this project.");
    }
    console.log(`      Response: ${err}\n`);
    process.exit(1);
  }
  if (res.status === 404) {
    console.log("FAIL  Edge function not found (404)");
    console.log(`      Deploy: npm run supabase:functions:deploy-invite -- --project-ref ${ref}\n`);
    process.exit(1);
  }
  if (res.status === 500 && /misconfigured/i.test(err)) {
    console.log("FAIL  Edge secrets missing on Supabase (500)");
    console.log("      Set BREVO_API_KEY and INVITE_EDGE_SECRET in Dashboard → Edge Functions → Secrets.\n");
    process.exit(1);
  }
  if (res.status === 502) {
    console.log("WARN  Brevo rejected the test send (502) — Edge auth OK, fix Brevo/template/sender.");
    console.log(`      ${err}\n`);
    process.exit(0);
  }
  if (res.ok) {
    console.log("OK    Edge function reachable and accepted request (mail may have been sent to test address).");
    console.log("      Use a real invite in the app for end-to-end check.\n");
    process.exit(0);
  }

  console.log(`FAIL  Unexpected HTTP ${res.status}: ${err}\n`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
