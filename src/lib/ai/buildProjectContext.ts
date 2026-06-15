import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CHAT_CONTEXT_MAX_TASKS_PER_ROOM,
  CHAT_CONTEXT_QUOTE_SUMMARY_MAX_CHARS,
  getProjectContextMaxChars,
  truncateTextForModel,
} from "@/lib/ai/limits";
import { computeBouwdepotUsage } from "@/lib/dashboard/bouwdepot";
import { computeProjectSpendOverview } from "@/lib/dashboard/projectBudget";
import type {
  BouwdepotStatus,
  KostCategorie,
  KostType,
  Project,
  ProjectExpense,
  TaskPriority,
  TaskStatus,
} from "@/lib/renovation/types";

const CATEGORY_LABELS: Record<KostCategorie, string> = {
  deuren: "Deuren & Kozijnen",
  vloeren: "Vloeren",
  elektra: "Elektra",
  sanitair: "Sanitair",
  schilderwerk: "Schilderwerk",
  dakwerk: "Dakwerk",
  keuken: "Keuken",
  overig: "Overig",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "te doen",
  doing: "bezig",
  done: "klaar",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "laag",
  medium: "normaal",
  high: "hoog",
};

const KOST_TYPE_LABELS: Record<KostType, string> = {
  werkelijk: "werkelijke kosten",
  geschat: "geschatte kosten",
};

const BOUWDEPOT_STATUS_LABELS: Record<BouwdepotStatus, string> = {
  open: "nog niet ingediend",
  ingediend: "ingediend",
  uitbetaald: "uitbetaald",
};

function parseNumericNullable(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function mapProjectRow(row: Record<string, unknown>): Project {
  const own = parseNumericNullable(row.own_contribution);
  const depot = parseNumericNullable(row.construction_depot_total);
  const storedTotal =
    typeof row.total_budget === "number"
      ? row.total_budget
      : Number.parseFloat(String(row.total_budget ?? "0")) || 0;
  const totalBudget = storedTotal > 0 ? storedTotal : (own ?? 0) + (depot ?? 0);
  const ek = row.expected_key_handover;
  const psd = row.planning_start_date;
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    totalBudget,
    ownContribution: own,
    constructionDepotTotal: depot,
    address: String(row.address ?? ""),
    expectedKeyHandover: ek == null || ek === "" ? null : String(ek),
    planningStartDate: psd == null || psd === "" ? null : String(psd),
    notes: String(row.notes ?? ""),
  };
}

function parseKostType(value: unknown): KostType {
  return value === "geschat" ? "geschat" : "werkelijk";
}

function parseKostCategorie(value: unknown): KostCategorie {
  const valid: KostCategorie[] = [
    "deuren",
    "vloeren",
    "elektra",
    "sanitair",
    "schilderwerk",
    "dakwerk",
    "keuken",
    "overig",
  ];
  const s = String(value ?? "overig");
  return valid.includes(s as KostCategorie) ? (s as KostCategorie) : "overig";
}

function parseBouwdepotStatus(value: unknown): BouwdepotStatus {
  if (value === "ingediend" || value === "uitbetaald") return value;
  return "open";
}

function mapExpenseRow(row: Record<string, unknown>): ProjectExpense {
  const so = row.spent_on;
  const tid = row.task_id;
  const funded = row.funded_by_construction_depot;
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    title: String(row.title ?? ""),
    amount:
      typeof row.amount === "number"
        ? row.amount
        : Number.parseFloat(String(row.amount ?? "0")) || 0,
    spentOn: so == null || so === "" ? null : String(so),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at ?? ""),
    taskId: tid == null || tid === "" ? null : String(tid),
    fundedByConstructionDepot: funded === true,
    kostType: parseKostType(row.kost_type),
    categorie: parseKostCategorie(row.categorie),
    bouwdepotStatus: parseBouwdepotStatus(row.bouwdepot_status),
  };
}

function formatExpenseLine(expense: ProjectExpense): string {
  const depotPart = expense.fundedByConstructionDepot
    ? `, uit bouwdepot, status: ${BOUWDEPOT_STATUS_LABELS[expense.bouwdepotStatus]}`
    : ", niet uit bouwdepot";
  const when =
    expense.spentOn != null && expense.spentOn.trim() !== "" ? expense.spentOn : "geen datum";
  const note =
    expense.notes.trim() !== "" ? ` — ${expense.notes.slice(0, 80)}` : "";
  return `  - ${expense.title}: €${expense.amount} (${when}, ${KOST_TYPE_LABELS[expense.kostType]}${depotPart})${note}`;
}

function formatBudgetOverview(project: Project, expenses: ProjectExpense[]): string[] {
  const overview = computeProjectSpendOverview(project, expenses);
  const depot = computeBouwdepotUsage(project, expenses);
  return [
    "BUDGETOVERZICHT:",
    `- Totaal budget: €${overview.totalBudget}`,
    `- Eigen geld (totaal): €${overview.ownTotal}`,
    `- Bouwdepot (totaal): €${overview.depotTotal}`,
    `- Besteed (som kostenposten): €${overview.totalSpent}`,
    `- Resterend budget: €${overview.remainingBudget}`,
    `- Bouwdepot gebruikt: €${depot.usedAmount}`,
    `- Bouwdepot ingediend: €${depot.ingediend}`,
    `- Bouwdepot uitbetaald: €${depot.uitbetaald}`,
    `- Bouwdepot resterend: €${depot.remainingAmount}`,
  ];
}

function groupExpensesByCategory(expenses: ProjectExpense[]): string[] {
  if (expenses.length === 0) {
    return ["- Nog geen kostenposten geregistreerd."];
  }

  const byCategory = new Map<KostCategorie, ProjectExpense[]>();
  for (const expense of expenses) {
    const list = byCategory.get(expense.categorie) ?? [];
    list.push(expense);
    byCategory.set(expense.categorie, list);
  }

  const lines: string[] = [];
  for (const [category, items] of byCategory) {
    lines.push(`### ${CATEGORY_LABELS[category]}`);
    for (const item of items) {
      lines.push(formatExpenseLine(item));
    }
  }
  return lines;
}

export async function buildProjectContext(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ ok: true; text: string } | { ok: false; status: number; error: string }> {
  const [projectRes, roomsRes, docsRes, expensesRes] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id,name,total_budget,own_contribution,construction_depot_total,address,expected_key_handover,planning_start_date,notes"
      )
      .eq("id", projectId)
      .maybeSingle(),
    supabase.from("rooms").select("id,name,project_id").eq("project_id", projectId),
    supabase.from("documents").select("file_name,ai_summary").eq("project_id", projectId),
    supabase
      .from("project_expenses")
      .select(
        "id,project_id,title,amount,spent_on,notes,created_at,task_id,funded_by_construction_depot,kost_type,categorie,bouwdepot_status"
      )
      .eq("project_id", projectId),
  ]);

  if (projectRes.error) {
    console.error("Chat project context", { projectError: projectRes.error.message });
    return { ok: false, status: 500, error: "Failed to load project." };
  }
  if (!projectRes.data) {
    return { ok: false, status: 404, error: "Project not found." };
  }

  if (roomsRes.error) {
    console.error("Chat project context", { roomsError: roomsRes.error.message });
    return { ok: false, status: 500, error: "Failed to load rooms." };
  }

  let tasksRes: {
    data: Array<Record<string, unknown>> | null;
    error: { message: string } | null;
  } = { data: [], error: null };

  const rooms = roomsRes.data ?? [];
  const roomIdList = rooms.map((room) => String(room.id));

  const taskRoomsByTask = new Map<string, string[]>();
  if (roomIdList.length > 0) {
    const trRes = await supabase.from("task_rooms").select("task_id,room_id").in("room_id", roomIdList);
    if (trRes.error) {
      console.error("Chat project context", { taskRoomsError: trRes.error.message });
      return { ok: false, status: 500, error: "Failed to load task rooms." };
    }
    for (const row of trRes.data ?? []) {
      const tid = String(row.task_id);
      const rid = String(row.room_id);
      const arr = taskRoomsByTask.get(tid) ?? [];
      arr.push(rid);
      taskRoomsByTask.set(tid, arr);
    }
    const taskIdList = [...taskRoomsByTask.keys()];
    if (taskIdList.length > 0) {
      tasksRes = await supabase
        .from("tasks")
        .select("id,title,status,duration_days,priority,description,sort_order")
        .in("id", taskIdList);
    }
  }

  if (tasksRes.error) {
    console.error("Chat project context", { tasksError: tasksRes.error.message });
    return { ok: false, status: 500, error: "Failed to load tasks." };
  }

  const scopedTasks = tasksRes.data ?? [];
  const project = mapProjectRow(projectRes.data as Record<string, unknown>);
  const expenses = expensesRes.error
    ? []
    : (expensesRes.data ?? []).map((row) => mapExpenseRow(row as Record<string, unknown>));

  const planningStart = project.planningStartDate ?? "niet ingesteld";

  const roomLines = rooms.map((room) => {
    const tasksForRoom = scopedTasks
      .filter((task) => (taskRoomsByTask.get(String(task.id)) ?? []).includes(String(room.id)))
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .slice(0, CHAT_CONTEXT_MAX_TASKS_PER_ROOM);
    const taskSummary =
      tasksForRoom.length === 0
        ? "nog geen taken"
        : tasksForRoom
            .map((task) => {
              const status = STATUS_LABELS[(task.status as TaskStatus) ?? "todo"] ?? String(task.status);
              const priority =
                PRIORITY_LABELS[(task.priority as TaskPriority) ?? "medium"] ?? String(task.priority);
              return `${task.title} [${status}, prioriteit ${priority}, geschatte duur ca. ${task.duration_days} werkdagen]`;
            })
            .join("; ");
    return `- ${room.name}: ${taskSummary}`;
  });

  const docs = docsRes.error ? [] : (docsRes.data ?? []);
  const docLines =
    docs.length === 0
      ? ["- Nog geen offertes geüpload."]
      : docs.map((d: { file_name?: unknown; ai_summary?: unknown }) => {
          const fn = String(d.file_name ?? "bestand");
          const summary = d.ai_summary != null ? String(d.ai_summary).trim() : "";
          if (!summary) {
            return `- ${fn} (geen samenvatting — gebruik Samenvatten op de Offertes-pagina)`;
          }
          const cap = CHAT_CONTEXT_QUOTE_SUMMARY_MAX_CHARS;
          return `- ${fn}: ${summary.slice(0, cap)}${summary.length > cap ? "…" : ""}`;
        });

  const p = projectRes.data as Record<string, unknown>;
  const text = [
    `Geselecteerd project: ${p.name}`,
    `Totaal budget: €${project.totalBudget}`,
    project.ownContribution != null ? `Eigen geld: €${project.ownContribution}` : "",
    project.constructionDepotTotal != null ? `Bouwdepot-totaal: €${project.constructionDepotTotal}` : "",
    project.address ? `Adres: ${project.address}` : "",
    project.expectedKeyHandover ? `Verwachte sleuteloverdracht: ${project.expectedKeyHandover}` : "",
    `Planning startdatum: ${planningStart}`,
    project.notes
      ? `Notities: ${String(project.notes).slice(0, 500)}${String(project.notes).length > 500 ? "…" : ""}`
      : "",
    `Kamers: ${rooms.length}`,
    `Taken: ${scopedTasks.length}`,
    ...formatBudgetOverview(project, expenses),
    "Kostenposten (per categorie):",
    ...groupExpensesByCategory(expenses),
    "Geüploade offertes:",
    ...docLines,
    "Ontbrekende gegevens expliciet benoemen en vragen om aan te vullen waar nodig: kamers, taken, budget, eigen geld, bouwdepot, planning startdatum, geschatte duur per taak, prioriteit en kostenposten.",
    `Per kamer worden maximaal ${CHAT_CONTEXT_MAX_TASKS_PER_ROOM} taken getoond, in planningvolgorde.`,
    "Kamers en taken:",
    ...roomLines,
  ]
    .filter(Boolean)
    .join("\n");

  const capped = truncateTextForModel(text, getProjectContextMaxChars());
  return { ok: true, text: capped.text };
}
