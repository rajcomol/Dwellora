import { describe, expect, it } from "vitest";
import { buildKostenramingData, categorizeTaskTitle, kostenramingToCsv } from "@/lib/finances/kostenraming";
import type { Task } from "@/lib/renovation/types";

function sampleTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    projectId: "p1",
    title: "Vloer tegels leggen",
    roomIds: ["r1"],
    renovationPhase: "afwerking",
    status: "todo",
    estimatedCost: 1500,
    actualCost: 0,
    durationDays: 3,
    priority: "medium",
    description: "",
    sortOrder: 0,
    startDate: null,
    assignedRosterId: null,
    fundedByConstructionDepot: false,
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
  it("groups tasks and computes expected totals", () => {
    const data = buildKostenramingData({
      projectId: "p1",
      rooms: [{ id: "r1", projectId: "p1", name: "Woonkamer" }],
      tasks: [
        sampleTask({ id: "t1", title: "Vloer laminaat", estimatedCost: 1000, actualCost: 0 }),
        sampleTask({ id: "t2", title: "Stopcontacten", estimatedCost: 500, actualCost: 750 }),
      ],
      projectExpenses: [
        {
          id: "e1",
          projectId: "p1",
          title: "Bouwmarkt",
          amount: 120,
          spentOn: null,
          notes: "",
          taskId: null,
          fundedByConstructionDepot: false,
          createdAt: "2026-01-01",
        },
      ],
      declaraties: [],
    });

    expect(data.categories.some((c) => c.id === "vloeren")).toBe(true);
    expect(data.categories.some((c) => c.id === "elektra")).toBe(true);
    expect(data.looseExpenses).toHaveLength(1);
    expect(data.totals.estimated).toBe(1500);
    expect(data.totals.actual).toBe(870);
    expect(data.totals.expected).toBe(1870);
  });
});

describe("kostenramingToCsv", () => {
  it("exports expected columns", () => {
    const data = buildKostenramingData({
      projectId: "p1",
      rooms: [{ id: "r1", projectId: "p1", name: "Keuken" }],
      tasks: [sampleTask({ title: "Keuken aanrecht", estimatedCost: 2000 })],
      projectExpenses: [],
      declaraties: [],
    });
    const csv = kostenramingToCsv(data);
    expect(csv).toContain("Categorie,Taaknaam,Ruimte,Type,Bedrag");
    expect(csv).toContain("Keuken");
  });
});
