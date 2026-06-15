import { describe, expect, it } from "vitest";
import { buildKostenramingData, categorizeTaskTitle, kostenramingToCsv } from "@/lib/finances/kostenraming";
import type { ProjectExpense } from "@/lib/renovation/types";

function expense(overrides: Partial<ProjectExpense> = {}): ProjectExpense {
  return {
    id: "e1",
    projectId: "p1",
    title: "Vloer schatting",
    amount: 800,
    spentOn: null,
    notes: "",
    taskId: null,
    fundedByConstructionDepot: false,
    kostType: "geschat",
    categorie: "vloeren",
    bouwdepotStatus: "open",
    createdAt: "2026-01-01",
    ...overrides,
  };
}

describe("categorizeTaskTitle", () => {
  it("matches vloer keywords", () => {
    expect(categorizeTaskTitle("Vloer tegels leggen")).toBe("vloeren");
  });

  it("matches keuken keywords", () => {
    expect(categorizeTaskTitle("Nieuwe keuken plaatsen")).toBe("keuken");
  });

  it("falls back to overig", () => {
    expect(categorizeTaskTitle("Algemene klus")).toBe("overig");
  });
});

describe("buildKostenramingData", () => {
  it("groups kostenposten and computes totals from expenses only", () => {
    const data = buildKostenramingData({
      projectId: "p1",
      projectExpenses: [
        expense({ id: "e1", title: "Vloer laminaat", amount: 1000, categorie: "vloeren", kostType: "geschat" }),
        expense({
          id: "e2",
          title: "Stopcontacten",
          amount: 750,
          categorie: "elektra",
          kostType: "werkelijk",
        }),
        expense({
          id: "e3",
          title: "Bouwmarkt",
          amount: 120,
          categorie: "overig",
          kostType: "werkelijk",
        }),
      ],
    });

    expect(data.categories.some((c) => c.id === "vloeren")).toBe(true);
    expect(data.categories.some((c) => c.id === "elektra")).toBe(true);
    expect(data.looseExpenses).toHaveLength(3);
    expect(data.totals.estimated).toBe(1000);
    expect(data.totals.actual).toBe(870);
    expect(data.totals.expected).toBe(1870);
  });
});

describe("kostenramingToCsv", () => {
  it("exports expected columns", () => {
    const data = buildKostenramingData({
      projectId: "p1",
      projectExpenses: [
        expense({ title: "Keuken aanrecht", amount: 2000, categorie: "keuken", kostType: "geschat" }),
      ],
    });
    const csv = kostenramingToCsv(data);
    expect(csv).toContain("Categorie,Taaknaam,Ruimte,Type,Bedrag");
    expect(csv).toContain("Keuken");
  });
});
