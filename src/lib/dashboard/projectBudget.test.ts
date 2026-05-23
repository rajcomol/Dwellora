import { describe, expect, it } from "vitest";
import { computeProjectSpendOverview, looseExpensesForBudget } from "@/lib/dashboard/projectBudget";
import { DEFAULT_RENOVATION_PHASE } from "@/lib/renovation/phases";
import type { Project, ProjectExpense, Task } from "@/lib/renovation/types";

const project: Project = {
  id: "p1",
  name: "Test",
  totalBudget: 30000,
  ownContribution: 10000,
  constructionDepotTotal: 20000,
  address: "",
  expectedKeyHandover: null,
  notes: "",
};

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    projectId: "p1",
    title: "Taak",
    roomIds: [],
    renovationPhase: DEFAULT_RENOVATION_PHASE,
    status: "todo",
    estimatedCost: 1000,
    actualCost: 0,
    durationDays: 1,
    priority: "medium",
    description: "",
    sortOrder: 0,
    startDate: null,
    assignedRosterId: null,
    fundedByConstructionDepot: false,
    ...overrides,
  };
}

function expense(overrides: Partial<ProjectExpense> = {}): ProjectExpense {
  return {
    id: "e1",
    projectId: "p1",
    title: "Uitgave",
    amount: 500,
    spentOn: "2025-06-01",
    notes: "",
    createdAt: "2025-06-01T12:00:00Z",
    taskId: null,
    fundedByConstructionDepot: false,
    ...overrides,
  };
}

describe("computeProjectSpendOverview", () => {
  it("splits usage between own money and bouwdepot", () => {
    const overview = computeProjectSpendOverview(
      project,
      [
        task({ id: "t1", estimatedCost: 2000, fundedByConstructionDepot: false }),
        task({ id: "t2", estimatedCost: 3000, fundedByConstructionDepot: true }),
      ],
      [
        expense({ id: "e1", amount: 400, fundedByConstructionDepot: false }),
        expense({ id: "e2", amount: 600, fundedByConstructionDepot: true }),
      ]
    );
    expect(overview.ownUsed).toBe(2400);
    expect(overview.ownRemaining).toBe(7600);
    expect(overview.depotUsed).toBe(3600);
    expect(overview.depotRemaining).toBe(16400);
    expect(overview.remainingBudget).toBe(30000 - 1000);
  });

  it("remaining budget uses actual task costs plus loose expenses only", () => {
    const overview = computeProjectSpendOverview(
      project,
      [task({ id: "t1", estimatedCost: 5000, actualCost: 2000 })],
      [expense({ id: "e1", amount: 1500, taskId: null })]
    );
    expect(overview.totalSpent).toBe(3500);
    expect(overview.remainingBudget).toBe(30000 - 2000 - 1500);
  });

  it("excludes expenses linked to a live task from loose spend (no double count)", () => {
    const tasks = [task({ id: "t1", estimatedCost: 2000 })];
    const overview = computeProjectSpendOverview(project, tasks, [
      expense({ id: "e1", amount: 500, taskId: "t1" }),
      expense({ id: "e2", amount: 300, taskId: null }),
    ]);
    expect(overview.totalSpent).toBe(2300);
  });

  it("treats only unlinked expenses as loose spend", () => {
    const loose = looseExpensesForBudget([
      expense({ id: "e1", amount: 500, taskId: "t1" }),
      expense({ id: "e2", amount: 300, taskId: null }),
    ]);
    expect(loose).toHaveLength(1);
    expect(loose[0]?.id).toBe("e2");
  });
});
