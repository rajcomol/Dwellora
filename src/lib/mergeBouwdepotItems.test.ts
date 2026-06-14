import { describe, expect, it } from "vitest";
import { mergeBouwdepotItems } from "@/lib/mergeBouwdepotItems";
import type { BouwdepotDeclaratie, ProjectExpense, Task } from "@/lib/renovation/types";

function sampleTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    projectId: "p1",
    title: "Tegels",
    roomIds: [],
    renovationPhase: "afwerking",
    status: "todo",
    estimatedCost: 2000,
    actualCost: 0,
    durationDays: 1,
    priority: "medium",
    description: "",
    sortOrder: 0,
    startDate: null,
    assignedRosterId: null,
    fundedByConstructionDepot: true,
    ...overrides,
  };
}

function sampleExpense(overrides: Partial<ProjectExpense> = {}): ProjectExpense {
  return {
    id: "e1",
    projectId: "p1",
    title: "Dakkapel",
    amount: 1500,
    spentOn: "2026-01-10",
    notes: "",
    taskId: null,
    fundedByConstructionDepot: true,
    createdAt: "2026-01-10T10:00:00Z",
    ...overrides,
  };
}

function sampleDeclaratie(overrides: Partial<BouwdepotDeclaratie> = {}): BouwdepotDeclaratie {
  return {
    id: "d1",
    projectId: "p1",
    userId: "u1",
    omschrijving: "Sanitair",
    bedrag: 800,
    status: "open",
    ingediendOp: null,
    uitbetaaldOp: null,
    taakId: null,
    notities: "",
    aangemaaktOp: "2026-01-05T10:00:00Z",
    bijgewerktOp: "2026-01-05T10:00:00Z",
    ...overrides,
  };
}

describe("mergeBouwdepotItems", () => {
  it("includes declaraties, depot expenses and depot tasks", () => {
    const rows = mergeBouwdepotItems(
      "p1",
      [sampleDeclaratie({ id: "d1" })],
      [sampleExpense({ id: "e1" })],
      [sampleTask({ id: "t1" })]
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.type)).toEqual(["declaratie", "taak", "losse_uitgave"]);
  });

  it("sorts declaraties before other types and ingediend before open", () => {
    const rows = mergeBouwdepotItems(
      "p1",
      [
        sampleDeclaratie({ id: "d-open", status: "open", bedrag: 100 }),
        sampleDeclaratie({ id: "d-ing", status: "ingediend", bedrag: 50 }),
      ],
      [sampleExpense({ id: "e1", amount: 3000 })],
      []
    );
    expect(rows[0].source_id).toBe("d-ing");
    expect(rows[1].source_id).toBe("d-open");
    expect(rows[2].type).toBe("losse_uitgave");
  });

  it("marks expenses and tasks as gekoppeld and not editable", () => {
    const rows = mergeBouwdepotItems("p1", [], [sampleExpense()], [sampleTask()]);
    expect(rows.every((r) => r.type !== "declaratie" ? r.status === "gekoppeld" : true)).toBe(true);
    expect(rows.filter((r) => r.type !== "declaratie").every((r) => !r.editable)).toBe(true);
  });
});
