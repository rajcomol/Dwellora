/**
 * Eenmalige opruiming van Playwright-testprojecten (naam begint met "PW ").
 *
 * 1. Exporteert backup naar exports/pw-e2e-backup-<timestamp>.json
 * 2. Verwijdert die projecten (CASCADE: ruimtes, taken, kostenposten, …)
 *
 * Vereist in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/cleanup-pw-e2e-projects.mjs
 *   node scripts/cleanup-pw-e2e-projects.mjs --dry-run
 */
import pkg from "@next/env";
import {
  PW_E2E_PROJECT_PREFIX,
  buildPwProjectsBackup,
  createSupabaseAdmin,
  deletePwProjects,
  listPwProjects,
  writeBackupFile,
} from "./lib/pw-e2e-cleanup.mjs";

const { loadEnvConfig } = pkg;

loadEnvConfig(process.cwd());

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const admin = createSupabaseAdmin();
  if (!admin) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const projects = await listPwProjects(admin, PW_E2E_PROJECT_PREFIX);
  if (projects.length === 0) {
    console.log(`No projects found with prefix "${PW_E2E_PROJECT_PREFIX}".`);
    return;
  }

  console.log(`Found ${projects.length} PW test project(s):`);
  for (const project of projects) {
    console.log(`  - ${project.name} (${project.id})`);
  }

  const backup = await buildPwProjectsBackup(admin, PW_E2E_PROJECT_PREFIX);
  const backupPath = writeBackupFile(backup);
  console.log(`Backup written: ${backupPath}`);
  console.log(
    `Counts: ${backup.counts.projects} projects, ${backup.counts.rooms} rooms, ${backup.counts.tasks} tasks, ${backup.counts.project_expenses} expenses`
  );

  if (dryRun) {
    console.log("Dry run — no rows deleted.");
    return;
  }

  const { deleted } = await deletePwProjects(
    admin,
    projects.map((p) => p.id)
  );
  console.log(`Deleted ${deleted} project(s) and related rows (via CASCADE).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
