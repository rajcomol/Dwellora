import { describe, expect, it } from "vitest";
import { mergeKostenItems } from "@/lib/mergeKostenItems";
import type { ProjectExpense, Task } from "@/lib/renovation/types";

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

function sampleExpense(overrides: Partial<ProjectExpense> = {}): ProjectExpense {
  return {
    id: "e1",
    projectId: "p1",
    title: "Bouwmarkt",
    amount: 120,
    spentOn: "2026-01-10",
    notes: "",
    taskId: null,
    fundedByConstructionDepot: false,
    createdAt: "2026-01-10T10:00:00Z",
    ...overrides,
  };
}

describe("mergeKostenItems", () => {
  it("merges tasks and loose expenses only", () => {
    const regels = mergeKostenItems(
      [sampleTask({ id: "t1", estimatedCost: 500, actualCost: 0 })],
      [sampleExpense({ id: "e1", amount: 75 })]
    );

    expect(regels).toHaveLength(2);
    expect(regels.map((r) => r.type)).toEqual(["losse_uitgave", "taak"]);
  });

  it("uses actual cost for tasks when available", () => {
    const [regel] = mergeKostenItems([sampleTask({ estimatedCost: 500, actualCost: 750 })], []);
    expect(regel.bedrag).toBe(750);
    expect(regel.status).toBe("werkelijk");
  });

  it("falls back to estimated cost for tasks without actual", () => {
    const [regel] = mergeKostenItems([sampleTask({ estimatedCost: 500, actualCost: 0 })], []);
    expect(regel.bedrag).toBe(500);
    expect(regel.status).toBe("geschat");
  });

  it("excludes expenses linked to a task", () => {
    const regels = mergeKostenItems(
      [],
      [sampleExpense({ taskId: "t99" }), sampleExpense({ id: "e2", taskId: null })]
    );
    expect(regels).toHaveLength(1);
    expect(regels[0].type).toBe("losse_uitgave");
  });

  it("sorts werkelijk before geschat", () => {
    const regels = mergeKostenItems(
      [sampleTask({ id: "t-geschat", estimatedCost: 900, actualCost: 0 })],
      [sampleExpense({ id: "e-werkelijk", amount: 50 })]
    );
    expect(regels.map((r) => r.id)).toEqual(["losse_uitgave-e-werkelijk", "taak-t-geschat"]);
  });

  it("carries depot linkage flags", () => {
    const regels = mergeKostenItems(
      [sampleTask({ fundedByConstructionDepot: true })],
      [sampleExpense({ fundedByConstructionDepot: true })]
    );
    expect(regels.find((r) => r.type === "taak")?.gekoppeld_aan_depot).toBe(true);
    expect(regels.find((r) => r.type === "losse_uitgave")?.gekoppeld_aan_depot).toBe(true);
  });
});
