import { filterTasksForProjectId } from "@/lib/dashboard/projectBudget";
import { taskEstimatedAmount } from "@/lib/dashboard/taskCosts";
import type { BouwdepotDeclaratie, ProjectExpense, Room, Task } from "@/lib/renovation/types";

export type CostLineType = "werkelijk" | "geschat";

export type KostenramingTaskLine = {
  kind: "task";
  taskId: string;
  title: string;
  roomName: string;
  amount: number;
  costType: CostLineType;
  estimated: number;
  actual: number;
  expected: number;
};

export type KostenramingExpenseLine = {
  kind: "expense";
  expenseId: string;
  title: string;
  amount: number;
  costType: "werkelijk";
};

export type KostenramingDeclaratieLine = {
  kind: "declaratie";
  declaratieId: string;
  title: string;
  amount: number;
  costType: "werkelijk";
};

export type KostenramingCategoryId =
  | "deuren"
  | "vloeren"
  | "elektra"
  | "sanitair"
  | "schilderwerk"
  | "dakwerk"
  | "keuken"
  | "overig";

export type KostenramingCategory = {
  id: KostenramingCategoryId;
  icon: string;
  label: string;
  items: KostenramingTaskLine[];
  subtotal: number;
};

export type KostenramingData = {
  categories: KostenramingCategory[];
  looseExpenses: KostenramingExpenseLine[];
  declaraties: KostenramingDeclaratieLine[];
  totals: {
    estimated: number;
    actual: number;
    expected: number;
  };
  hasAnyCosts: boolean;
};

const CATEGORY_DEFS: { id: KostenramingCategoryId; icon: string; label: string; keywords: string[] }[] = [
  { id: "deuren", icon: "🚪", label: "Deuren & Kozijnen", keywords: ["deur", "kozijn", "raam"] },
  { id: "vloeren", icon: "🪵", label: "Vloeren", keywords: ["vloer", "tegel", "parket", "laminaat"] },
  {
    id: "elektra",
    icon: "⚡",
    label: "Elektra",
    keywords: ["electra", "elektrisch", "stopcontact", "schakelaar", "spot", "verlichting"],
  },
  { id: "sanitair", icon: "🚿", label: "Sanitair", keywords: ["wc", "toilet", "douche", "bad", "sanitair", "kraan"] },
  { id: "schilderwerk", icon: "🎨", label: "Schilderwerk", keywords: ["schilder", "verf", "stucwerk", "muur"] },
  { id: "dakwerk", icon: "🏠", label: "Dakwerk", keywords: ["dak", "dakkapel", "dakgoot"] },
  { id: "keuken", icon: "🍳", label: "Keuken", keywords: ["keuken", "aanrecht", "kookplaat"] },
];

export function categorizeTaskTitle(title: string): KostenramingCategoryId {
  const lower = title.toLowerCase();
  for (const def of CATEGORY_DEFS) {
    if (def.keywords.some((kw) => lower.includes(kw))) return def.id;
  }
  return "overig";
}

function taskHasCosts(task: Task): boolean {
  const estimated = taskEstimatedAmount(task);
  const actual = Number.isFinite(task.actualCost) && task.actualCost > 0 ? task.actualCost : 0;
  return estimated > 0 || actual > 0;
}

function roomNameForTask(task: Task, roomsById: Map<string, Room>): string {
  if (task.roomIds.length === 0) return "—";
  const names = task.roomIds
    .map((id) => roomsById.get(id)?.name)
    .filter((n): n is string => Boolean(n));
  return names.length > 0 ? names.join(", ") : "—";
}

function toTaskLine(task: Task, roomsById: Map<string, Room>): KostenramingTaskLine {
  const estimated = taskEstimatedAmount(task);
  const actual = Number.isFinite(task.actualCost) && task.actualCost > 0 ? task.actualCost : 0;
  const costType: CostLineType = actual > 0 ? "werkelijk" : "geschat";
  const amount = actual > 0 ? actual : estimated;
  return {
    kind: "task",
    taskId: task.id,
    title: task.title,
    roomName: roomNameForTask(task, roomsById),
    amount,
    costType,
    estimated,
    actual,
    expected: actual > 0 ? actual : estimated,
  };
}

export function buildKostenramingData(params: {
  projectId: string;
  tasks: Task[];
  rooms: Room[];
  projectExpenses: ProjectExpense[];
  declaraties: BouwdepotDeclaratie[];
}): KostenramingData {
  const { projectId, tasks, rooms, projectExpenses, declaraties } = params;
  const roomIds = new Set(rooms.filter((r) => r.projectId === projectId).map((r) => r.id));
  const roomsById = new Map(rooms.map((r) => [r.id, r]));
  const projectTasks = filterTasksForProjectId(tasks, projectId, roomIds).filter(taskHasCosts);

  const buckets = new Map<KostenramingCategoryId, KostenramingTaskLine[]>();
  for (const def of CATEGORY_DEFS) buckets.set(def.id, []);
  buckets.set("overig", []);

  for (const task of projectTasks) {
    const categoryId = categorizeTaskTitle(task.title);
    buckets.get(categoryId)!.push(toTaskLine(task, roomsById));
  }

  const allCategories: KostenramingCategory[] = [
    ...CATEGORY_DEFS.map((def): KostenramingCategory => {
      const items = buckets.get(def.id) ?? [];
      return {
        id: def.id,
        icon: def.icon,
        label: def.label,
        items,
        subtotal: items.reduce((s, i) => s + i.expected, 0),
      };
    }),
    {
      id: "overig",
      icon: "📦",
      label: "Overig",
      items: buckets.get("overig") ?? [],
      subtotal: (buckets.get("overig") ?? []).reduce((s, i) => s + i.expected, 0),
    },
  ];

  const categories = allCategories.filter((c) => c.items.length > 0);

  const looseExpenses: KostenramingExpenseLine[] = projectExpenses
    .filter((e) => e.projectId === projectId && !e.taskId && Number.isFinite(e.amount) && e.amount > 0)
    .map((e) => ({
      kind: "expense" as const,
      expenseId: e.id,
      title: e.title,
      amount: e.amount,
      costType: "werkelijk" as const,
    }));

  const declaratieLines: KostenramingDeclaratieLine[] = declaraties
    .filter((d) => d.projectId === projectId && Number.isFinite(d.bedrag) && d.bedrag > 0)
    .map((d) => ({
      kind: "declaratie" as const,
      declaratieId: d.id,
      title: d.omschrijving,
      amount: d.bedrag,
      costType: "werkelijk" as const,
    }));

  const taskEstimatedTotal = projectTasks.reduce((s, t) => s + taskEstimatedAmount(t), 0);
  const taskActualTotal = projectTasks.reduce(
    (s, t) => s + (Number.isFinite(t.actualCost) && t.actualCost > 0 ? t.actualCost : 0),
    0
  );
  const taskExpectedTotal = projectTasks.reduce((s, t) => {
    const actual = Number.isFinite(t.actualCost) && t.actualCost > 0 ? t.actualCost : 0;
    return s + (actual > 0 ? actual : taskEstimatedAmount(t));
  }, 0);

  const looseTotal = looseExpenses.reduce((s, e) => s + e.amount, 0);
  const declaratieTotal = declaratieLines.reduce((s, d) => s + d.amount, 0);

  const hasAnyCosts =
    projectTasks.length > 0 || looseExpenses.length > 0 || declaratieLines.length > 0;

  return {
    categories,
    looseExpenses,
    declaraties: declaratieLines,
    totals: {
      estimated: taskEstimatedTotal,
      actual: taskActualTotal + looseTotal + declaratieTotal,
      expected: taskExpectedTotal + looseTotal + declaratieTotal,
    },
    hasAnyCosts,
  };
}

export type KostenramingCsvRow = {
  categorie: string;
  taaknaam: string;
  ruimte: string;
  type: CostLineType;
  bedrag: number;
};

export function kostenramingToCsvRows(data: KostenramingData): KostenramingCsvRow[] {
  const rows: KostenramingCsvRow[] = [];

  for (const category of data.categories) {
    for (const item of category.items) {
      rows.push({
        categorie: category.label,
        taaknaam: item.title,
        ruimte: item.roomName,
        type: item.costType,
        bedrag: item.amount,
      });
    }
  }

  for (const item of data.declaraties) {
    rows.push({
      categorie: "Bouwdepot declaraties",
      taaknaam: item.title,
      ruimte: "—",
      type: item.costType,
      bedrag: item.amount,
    });
  }

  for (const item of data.looseExpenses) {
    rows.push({
      categorie: "Losse uitgaven",
      taaknaam: item.title,
      ruimte: "—",
      type: item.costType,
      bedrag: item.amount,
    });
  }

  return rows;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function kostenramingToCsv(data: KostenramingData): string {
  const header = "Categorie,Taaknaam,Ruimte,Type,Bedrag";
  const lines = kostenramingToCsvRows(data).map((row) =>
    [
      csvEscape(row.categorie),
      csvEscape(row.taaknaam),
      csvEscape(row.ruimte),
      csvEscape(row.type),
      row.bedrag.toFixed(2).replace(".", ","),
    ].join(",")
  );
  return [header, ...lines].join("\r\n");
}

export function downloadKostenramingCsv(data: KostenramingData, fileName: string): void {
  const csv = kostenramingToCsv(data);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
