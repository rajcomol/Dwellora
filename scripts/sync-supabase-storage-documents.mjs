/**
 * One-off copy of Storage objects from a source Supabase project (build) to a target (prod).
 * Preserves object paths so public.documents.file_path stays valid after a DB copy.
 *
 * Usage (PowerShell example):
 *   $env:SOURCE_SUPABASE_URL="https://xxx.supabase.co"
 *   $env:SOURCE_SUPABASE_SERVICE_ROLE_KEY="..."
 *   $env:TARGET_SUPABASE_URL="https://yyy.supabase.co"
 *   $env:TARGET_SUPABASE_SERVICE_ROLE_KEY="..."
 *   npm run sync:supabase-storage
 *
 * Optional: STORAGE_BUCKET (default documents), DRY_RUN=1 (list only, no upload)
 */
import { createClient } from "@supabase/supabase-js";

const BUCKET = process.env.STORAGE_BUCKET ?? "documents";
const DRY_RUN = /^1|true|yes$/i.test(String(process.env.DRY_RUN ?? ""));

function requireEnv(name) {
  const v = process.env[name];
  if (!v?.trim()) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return v.trim();
}

/** List one prefix with pagination (flat, non-recursive). */
async function listPrefixPage(supabase, prefix) {
  const acc = [];
  let offset = 0;
  const limit = 1000;
  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit, offset });
    if (error) throw error;
    const batch = data ?? [];
    acc.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return acc;
}

/** Recursively collect file paths (not folder placeholders). */
async function listAllFilePaths(supabase, prefix = "") {
  const items = await listPrefixPage(supabase, prefix);
  const paths = [];
  for (const item of items) {
    const rel = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id == null) {
      paths.push(...(await listAllFilePaths(supabase, rel)));
    } else {
      paths.push(rel);
    }
  }
  return paths;
}

async function main() {
  const sourceUrl = requireEnv("SOURCE_SUPABASE_URL");
  const sourceKey = requireEnv("SOURCE_SUPABASE_SERVICE_ROLE_KEY");
  const targetUrl = requireEnv("TARGET_SUPABASE_URL");
  const targetKey = requireEnv("TARGET_SUPABASE_SERVICE_ROLE_KEY");

  const source = createClient(sourceUrl, sourceKey, { auth: { persistSession: false } });
  const target = createClient(targetUrl, targetKey, { auth: { persistSession: false } });

  console.log(`Bucket: ${BUCKET}  DRY_RUN=${DRY_RUN}\n`);

  const paths = await listAllFilePaths(source);
  console.log(`Found ${paths.length} object(s).\n`);

  if (DRY_RUN) {
    paths.slice(0, 50).forEach((p) => console.log(`  ${p}`));
    if (paths.length > 50) console.log(`  ... and ${paths.length - 50} more`);
    return;
  }

  let ok = 0;
  for (const path of paths) {
    const dl = await source.storage.from(BUCKET).download(path);
    if (dl.error) {
      console.error(`Download failed: ${path}`, dl.error.message);
      process.exit(1);
    }
    const blob = dl.data;
    const contentType = blob.type || "application/octet-stream";
    const up = await target.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType,
    });
    if (up.error) {
      console.error(`Upload failed: ${path}`, up.error.message);
      process.exit(1);
    }
    ok += 1;
    if (ok % 20 === 0 || ok === paths.length) {
      console.log(`Copied ${ok}/${paths.length}`);
    }
  }

  console.log(`Done. Copied ${ok} object(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
