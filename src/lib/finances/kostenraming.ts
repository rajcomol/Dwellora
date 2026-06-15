import type { KostCategorie, ProjectExpense } from "@/lib/renovation/types";

export type CostLineType = "werkelijk" | "geschat";

export type KostenramingExpenseLine = {
  kind: "expense";
  expenseId: string;
  title: string;
  amount: number;
  costType: CostLineType;
};

export type KostenramingBouwdepotLine = {
  kind: "bouwdepot";
  expenseId: string;
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
  items: KostenramingExpenseLine[];
  subtotal: number;
};

export type KostenramingData = {
  categories: KostenramingCategory[];
  looseExpenses: KostenramingExpenseLine[];
  bouwdepotExpenses: KostenramingBouwdepotLine[];
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

export function kostenCategoryLabel(title: string): string {
  const id = categorizeTaskTitle(title);
  return categorieLabel(id);
}

/** Label voor een opgeslagen kostencategorie (kostenposten). */
export function categorieLabel(id: KostCategorie): string {
  const def = CATEGORY_DEFS.find((c) => c.id === id);
  return def?.label ?? "Overig";
}

export const KOST_CATEGORIE_ORDER: KostCategorie[] = [
  ...CATEGORY_DEFS.map((d) => d.id),
  "overig",
];

function toExpenseLine(expense: ProjectExpense): KostenramingExpenseLine {
  return {
    kind: "expense",
    expenseId: expense.id,
    title: expense.title,
    amount: expense.amount,
    costType: expense.kostType,
  };
}

export function buildKostenramingData(params: {
  projectId: string;
  projectExpenses: ProjectExpense[];
}): KostenramingData {
  const { projectId, projectExpenses } = params;
  const projectItems = projectExpenses.filter(
    (e) => e.projectId === projectId && Number.isFinite(e.amount) && e.amount > 0
  );

  const buckets = new Map<KostenramingCategoryId, KostenramingExpenseLine[]>();
  for (const def of CATEGORY_DEFS) buckets.set(def.id, []);
  buckets.set("overig", []);

  for (const expense of projectItems.filter((e) => !e.fundedByConstructionDepot)) {
    const categoryId = expense.categorie;
    buckets.get(categoryId)!.push(toExpenseLine(expense));
  }

  const allCategories: KostenramingCategory[] = [
    ...CATEGORY_DEFS.map((def): KostenramingCategory => {
      const items = buckets.get(def.id) ?? [];
      return {
        id: def.id,
        icon: def.icon,
        label: def.label,
        items,
        subtotal: items.reduce((s, i) => s + i.amount, 0),
      };
    }),
    {
      id: "overig",
      icon: "📦",
      label: "Overig",
      items: buckets.get("overig") ?? [],
      subtotal: (buckets.get("overig") ?? []).reduce((s, i) => s + i.amount, 0),
    },
  ];

  const categories = allCategories.filter((c) => c.items.length > 0);

  const looseExpenses: KostenramingExpenseLine[] = projectItems
    .filter((e) => !e.fundedByConstructionDepot && !e.taskId)
    .map(toExpenseLine);

  const bouwdepotLines: KostenramingBouwdepotLine[] = projectItems
    .filter((e) => e.fundedByConstructionDepot)
    .map((e) => ({
      kind: "bouwdepot" as const,
      expenseId: e.id,
      title: e.title,
      amount: e.amount,
      costType: "werkelijk" as const,
    }));

  const estimatedTotal = projectItems
    .filter((e) => e.kostType === "geschat")
    .reduce((s, e) => s + e.amount, 0);
  const actualTotal = projectItems
    .filter((e) => e.kostType === "werkelijk")
    .reduce((s, e) => s + e.amount, 0);
  const expectedTotal = projectItems.reduce((s, e) => s + e.amount, 0);

  const hasAnyCosts = projectItems.length > 0;

  return {
    categories,
    looseExpenses,
    bouwdepotExpenses: bouwdepotLines,
    totals: {
      estimated: estimatedTotal,
      actual: actualTotal,
      expected: expectedTotal,
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
        ruimte: "—",
        type: item.costType,
        bedrag: item.amount,
      });
    }
  }

  for (const item of data.bouwdepotExpenses) {
    rows.push({
      categorie: "Bouwdepot",
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
