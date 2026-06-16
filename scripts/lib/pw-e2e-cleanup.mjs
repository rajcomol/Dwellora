import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PW_E2E_PROJECT_PREFIX = "PW ";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_BACKUP_DIR = join(__dirname, "..", "..", "exports");

function readEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

export function createSupabaseAdmin() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function listPwProjects(admin, prefix = PW_E2E_PROJECT_PREFIX) {
  const { data, error } = await admin
    .from("projects")
    .select("id, name, user_id, created_at, total_budget, own_contribution, construction_depot_total, address, expected_key_handover, planning_start_date, notes")
    .like("name", `${prefix}%`)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`listPwProjects failed: ${error.message}`);
  }
  return data ?? [];
}

async function fetchRelatedRows(admin, table, projectIds, projectColumn = "project_id", chunkSize = 40) {
  if (projectIds.length === 0) return [];
  const rows = [];
  for (let i = 0; i < projectIds.length; i += chunkSize) {
    const chunk = projectIds.slice(i, i + chunkSize);
    const { data, error } = await admin.from(table).select("*").in(projectColumn, chunk);
    if (error) {
      throw new Error(`fetchRelatedRows(${table}) failed: ${error.message}`);
    }
    rows.push(...(data ?? []));
  }
  return rows;
}

async function fetchTaskRooms(admin, taskIds, chunkSize = 80) {
  if (taskIds.length === 0) return [];
  const rows = [];
  for (let i = 0; i < taskIds.length; i += chunkSize) {
    const chunk = taskIds.slice(i, i + chunkSize);
    const { data, error } = await admin.from("task_rooms").select("*").in("task_id", chunk);
    if (error) {
      throw new Error(`fetchTaskRooms failed: ${error.message}`);
    }
    rows.push(...(data ?? []));
  }
  return rows;
}

export async function buildPwProjectsBackup(admin, prefix = PW_E2E_PROJECT_PREFIX) {
  const projects = await listPwProjects(admin, prefix);
  const projectIds = projects.map((p) => p.id);
  const rooms = await fetchRelatedRows(admin, "rooms", projectIds);
  const tasks = await fetchRelatedRows(admin, "tasks", projectIds);
  const projectExpenses = await fetchRelatedRows(admin, "project_expenses", projectIds);
  const taskRooms = await fetchTaskRooms(
    admin,
    tasks.map((t) => t.id)
  );

  return {
    exportedAt: new Date().toISOString(),
    prefix,
    supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
    counts: {
      projects: projects.length,
      rooms: rooms.length,
      tasks: tasks.length,
      project_expenses: projectExpenses.length,
      task_rooms: taskRooms.length,
    },
    projects,
    rooms,
    tasks,
    project_expenses: projectExpenses,
    task_rooms: taskRooms,
  };
}

export function writeBackupFile(backup, backupDir = DEFAULT_BACKUP_DIR) {
  mkdirSync(backupDir, { recursive: true });
  const stamp = backup.exportedAt.replace(/[:.]/g, "-");
  const filePath = join(backupDir, `pw-e2e-backup-${stamp}.json`);
  writeFileSync(filePath, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
  return filePath;
}

export async function deletePwProjects(admin, projectIds, chunkSize = 40) {
  if (projectIds.length === 0) {
    return { deleted: 0 };
  }
  let deleted = 0;
  for (let i = 0; i < projectIds.length; i += chunkSize) {
    const chunk = projectIds.slice(i, i + chunkSize);
    const { error } = await admin.from("projects").delete().in("id", chunk);
    if (error) {
      throw new Error(`deletePwProjects failed: ${error.message}`);
    }
    deleted += chunk.length;
  }
  return { deleted };
}
