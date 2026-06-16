/**
 * Export bouwdepot_declaraties vóór definitieve drop.
 *
 * Schrijft naar exports/:
 *   - bouwdepot-declaraties-<timestamp>.json
 *   - bouwdepot-declaraties-<timestamp>.csv
 *   - bouwdepot-declaraties-<timestamp>.sql
 *
 * Usage: node scripts/export-bouwdepot-declaraties.mjs
 */
import pkg from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { loadEnvConfig } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const exportDir = join(__dirname, "..", "exports");

loadEnvConfig(process.cwd());

function readEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function escapeCsv(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows) {
  if (rows.length === 0) {
    return "id,project_id,user_id,omschrijving,bedrag,status,ingediend_op,uitbetaald_op,taak_id,notities,aangemaakt_op,bijgewerkt_op\n";
  }
  const columns = Object.keys(rows[0]);
  const header = columns.join(",");
  const body = rows.map((row) => columns.map((col) => escapeCsv(row[col])).join(",")).join("\n");
  return `${header}\n${body}\n`;
}

function sqlLiteral(value) {
  if (value == null) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

function toSqlInsert(rows) {
  if (rows.length === 0) {
    return "-- bouwdepot_declaraties was empty at export time\n";
  }
  const columns = Object.keys(rows[0]);
  const lines = rows.map((row) => {
    const values = columns.map((col) => sqlLiteral(row[col])).join(", ");
    return `INSERT INTO public.bouwdepot_declaraties (${columns.join(", ")}) VALUES (${values});`;
  });
  return [
    "-- Backup of public.bouwdepot_declaraties before drop",
    "-- Table schema: supabase/migrations/20250630120000_bouwdepot_declaraties.sql",
    "",
    ...lines,
    "",
  ].join("\n");
}

async function main() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await admin
    .from("bouwdepot_declaraties")
    .select("*")
    .order("aangemaakt_op", { ascending: true });

  if (error) {
    console.error("Export failed:", error.message);
    process.exit(1);
  }

  const rows = data ?? [];
  const exportedAt = new Date().toISOString();
  const stamp = exportedAt.replace(/[:.]/g, "-");
  mkdirSync(exportDir, { recursive: true });

  const jsonPath = join(exportDir, `bouwdepot-declaraties-${stamp}.json`);
  const csvPath = join(exportDir, `bouwdepot-declaraties-${stamp}.csv`);
  const sqlPath = join(exportDir, `bouwdepot-declaraties-${stamp}.sql`);

  const payload = {
    exportedAt,
    supabaseUrl: url,
    table: "bouwdepot_declaraties",
    rowCount: rows.length,
    rows,
  };

  writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  writeFileSync(csvPath, toCsv(rows), "utf8");
  writeFileSync(sqlPath, toSqlInsert(rows), "utf8");

  console.log(`Exported ${rows.length} row(s):`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  CSV:  ${csvPath}`);
  console.log(`  SQL:  ${sqlPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
