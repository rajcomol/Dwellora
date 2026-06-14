import { describe, expect, it } from "vitest";
import {
  bouwdepotRemainingAmountClass,
  computeBouwdepotUsage,
  computeProjectBouwdepotBalance,
  taskBouwdepotChargeAmount,
} from "@/lib/dashboard/bouwdepot";
import { DEFAULT_RENOVATION_PHASE } from "@/lib/renovation/phases";
import type { BouwdepotDeclaratie, Project, ProjectExpense, Task } from "@/lib/renovation/types";

const project: Project = {
  id: "p1",
  name: "Test",
  totalBudget: 50000,
  ownContribution: 10000,
  constructionDepotTotal: 40000,
  address: "",
  expectedKeyHandover: null,
  notes: "",
};

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    projectId: "p1",
    title: "Tegels",
    roomIds: [],
    renovationPhase: DEFAULT_RENOVATION_PHASE,
    status: "todo",
    estimatedCost: 5000,
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

function expense(overrides: Partial<ProjectExpense> = {}): ProjectExpense {
  return {
    id: "e1",
    projectId: "p1",
    title: "Dakkapellen",
    amount: 31500,
    spentOn: "2025-06-01",
    notes: "",
    createdAt: "2025-06-01T12:00:00Z",
    taskId: null,
    fundedByConstructionDepot: true,
    ...overrides,
  };
}

function declaratie(overrides: Partial<BouwdepotDeclaratie> = {}): BouwdepotDeclaratie {
  return {
    id: "d1",
    projectId: "p1",
    userId: "u1",
    omschrijving: "Declaratie",
    bedrag: 1000,
    status: "uitbetaald",
    ingediendOp: "2025-06-01",
    uitbetaaldOp: "2025-06-15",
    taakId: null,
    notities: "",
    aangemaaktOp: "2025-06-01T12:00:00Z",
    bijgewerktOp: "2025-06-15T12:00:00Z",
    ...overrides,
  };
}

describe("taskBouwdepotChargeAmount", () => {
  it("uses estimated cost when actual is not filled", () => {
    expect(taskBouwdepotChargeAmount(task({ actualCost: 0, estimatedCost: 3000 }))).toBe(3000);
  });

  it("uses actual cost when filled", () => {
    expect(taskBouwdepotChargeAmount(task({ actualCost: 4200, estimatedCost: 3000 }))).toBe(4200);
  });

  it("returns 0 when task is not funded by depot", () => {
    expect(taskBouwdepotChargeAmount(task({ fundedByConstructionDepot: false }))).toBe(0);
  });
});

describe("bouwdepotRemainingAmountClass", () => {
  it("returns red below 10%, amber between 10-25%, green above 25%", () => {
    expect(bouwdepotRemainingAmountClass(500, 10000)).toContain("red");
    expect(bouwdepotRemainingAmountClass(2000, 10000)).toContain("amber");
    expect(bouwdepotRemainingAmountClass(3000, 10000)).toContain("emerald");
  });
});

describe("computeBouwdepotUsage", () => {
  it("includes loose project expenses linked to bouwdepot", () => {
    const usage = computeBouwdepotUsage(project, [], [expense()], []);
    expect(usage.depotExpenses).toBe(31500);
    expect(usage.usedAmount).toBe(31500);
    expect(usage.remainingAmount).toBe(8500);
  });

  it("sums uitbetaald and ingediende declaraties, depot expenses and depot tasks", () => {
    const usage = computeBouwdepotUsage(
      project,
      [task({ id: "t1", estimatedCost: 5000, actualCost: 0 })],
      [expense({ id: "e1", amount: 600, fundedByConstructionDepot: true })],
      [
        declaratie({ id: "d1", bedrag: 400, status: "uitbetaald" }),
        declaratie({ id: "d2", bedrag: 250, status: "ingediend" }),
      ]
    );
    expect(usage.uitbetaaldDeclaraties).toBe(400);
    expect(usage.ingediendDeclaraties).toBe(250);
    expect(usage.depotExpenses).toBe(600);
    expect(usage.depotTasks).toBe(5000);
    expect(usage.usedAmount).toBe(6250);
    expect(usage.remainingAmount).toBe(33750);
  });

  it("does not double-count tasks with an uitbetaald declaratie", () => {
    const usage = computeBouwdepotUsage(
      project,
      [task({ id: "t1", estimatedCost: 5000, actualCost: 0 })],
      [],
      [declaratie({ id: "d1", bedrag: 5000, status: "uitbetaald", taakId: "t1" })]
    );
    expect(usage.depotTasks).toBe(0);
    expect(usage.uitbetaaldDeclaraties).toBe(5000);
    expect(usage.usedAmount).toBe(5000);
  });
});

describe("computeProjectBouwdepotBalance", () => {
  it("computes used and remaining from linked tasks", () => {
    const balance = computeProjectBouwdepotBalance(project, [
      task({ id: "t1", estimatedCost: 10000, actualCost: 0 }),
      task({ id: "t2", estimatedCost: 5000, actualCost: 6000 }),
      task({ id: "t3", fundedByConstructionDepot: false, estimatedCost: 99999 }),
    ]);
    expect(balance.usedAmount).toBe(16000);
    expect(balance.remainingAmount).toBe(24000);
    expect(balance.linkedTaskCount).toBe(2);
  });

  it("includes depot-linked loose expenses in balance", () => {
    const balance = computeProjectBouwdepotBalance(project, [], [expense()], []);
    expect(balance.usedAmount).toBe(31500);
    expect(balance.remainingAmount).toBe(8500);
  });
});
