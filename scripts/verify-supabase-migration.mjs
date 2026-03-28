/**
 * Verifies migration artifacts against a live Supabase project.
 * Reads .env.local from repo root (no secrets printed).
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

function loadEnvLocal() {
  if (!existsSync(envPath)) {
    console.error("Missing .env.local at", envPath);
    process.exit(1);
  }
  const map = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    map[m[1]] = m[2].trim();
  }
  return map;
}

async function restGet(url, anonKey) {
  const res = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  const env = loadEnvLocal();
  const base = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !anon) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
    process.exit(1);
  }

  const checks = [];

  // 1) projects.user_id must exist (PostgREST returns 400 + message if column missing)
  const p = await restGet(`${base}/rest/v1/projects?select=id,user_id,name,total_budget&limit=1`, anon);
  const pMsg = p.json?.message ?? p.json?.hint ?? JSON.stringify(p.json).slice(0, 200);
  if (p.status === 400 && String(pMsg).toLowerCase().includes("user_id")) {
    checks.push({ name: "projects.user_id column", ok: false, detail: pMsg });
  } else if (!p.ok && p.status !== 200) {
    checks.push({ name: "projects table readable", ok: false, detail: `HTTP ${p.status} ${pMsg}` });
  } else {
    checks.push({ name: "projects.user_id column", ok: true, detail: "select=id,user_id accepted" });
  }

  // 2) Related tables
  for (const table of ["rooms", "tasks", "documents"]) {
    const r = await restGet(`${base}/rest/v1/${table}?select=id&limit=1`, anon);
    const msg = r.json?.message ?? r.json?.hint ?? "";
    checks.push({
      name: `table ${table}`,
      ok: r.ok || r.status === 200,
      detail: r.ok ? "reachable" : `HTTP ${r.status} ${msg || JSON.stringify(r.json).slice(0, 120)}`,
    });
  }

  // 3) Storage bucket "documents"
  // GET /bucket/{id} with the anon key often returns 404 even when the bucket exists: bucket
  // metadata is not exposed to anonymous clients (similar to empty listBuckets). Prefer checking
  // in the Dashboard, or set SUPABASE_SERVICE_ROLE_KEY in .env.local for a definitive API check.
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRole) {
    const b = await restGet(`${base}/storage/v1/bucket/documents`, serviceRole);
    const bucketOk = b.ok && b.json && typeof b.json === "object" && b.json.id === "documents";
    checks.push({
      name: 'storage bucket "documents" (service role)',
      ok: bucketOk,
      detail: bucketOk
        ? `public=${Boolean(b.json.public)}`
        : `HTTP ${b.status} ${JSON.stringify(b.json).slice(0, 150)}`,
    });
  } else {
    checks.push({
      name: 'storage bucket "documents"',
      ok: true,
      detail:
        "skipped metadata API with anon (404 is normal; Dashboard is authoritative). " +
        "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to verify via API.",
    });
  }

  console.log("Supabase migration checks:\n");
  for (const c of checks) {
    console.log(`${c.ok ? "OK  " : "FAIL"} ${c.name}`);
    console.log(`      ${c.detail}\n`);
  }

  const allOk = checks.every((c) => c.ok);
  if (!allOk) {
    console.log("Some checks failed.");
    process.exit(1);
  }
  console.log("All automated checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
