import { describe, expect, it } from "vitest";
import {
  bouwdepotRemainingAmountClass,
  computeBouwdepotUsage,
  computeProjectBouwdepotBalance,
  taskBouwdepotChargeAmount,
} from "@/lib/dashboard/bouwdepot";
import { DEFAULT_RENOVATION_PHASE } from "@/lib/renovation/phases";
import type { Project, ProjectExpense, Task } from "@/lib/renovation/types";

const project: Project = {
  id: "p1",
  name: "Test",
  totalBudget: 50000,
  ownContribution: 10000,
  constructionDepotTotal: 40000,
  address: "",
  expectedKeyHandover: null,
  planningStartDate: null,
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
    kostType: "werkelijk",
    categorie: "dakwerk",
    bouwdepotStatus: "open",
    ...overrides,
  };
}

describe("taskBouwdepotChargeAmount", () => {
  it("returns 0 (tasks no longer count toward depot)", () => {
    expect(taskBouwdepotChargeAmount(task({ actualCost: 4200 }))).toBe(0);
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
  it("sums all depot-linked expenses as used", () => {
    const usage = computeBouwdepotUsage(project, [expense()]);
    expect(usage.usedAmount).toBe(31500);
    expect(usage.remainingAmount).toBe(8500);
  });

  it("tracks ingediend and uitbetaald subtotals", () => {
    const usage = computeBouwdepotUsage(project, [
      expense({ id: "e1", amount: 400, bouwdepotStatus: "ingediend" }),
      expense({ id: "e2", amount: 250, bouwdepotStatus: "uitbetaald" }),
      expense({ id: "e3", amount: 600, bouwdepotStatus: "open" }),
    ]);
    expect(usage.ingediend).toBe(400);
    expect(usage.uitbetaald).toBe(250);
    expect(usage.usedAmount).toBe(1250);
    expect(usage.remainingAmount).toBe(38750);
  });

  it("ignores non-depot expenses", () => {
    const usage = computeBouwdepotUsage(project, [
      expense({ fundedByConstructionDepot: false, amount: 99999 }),
      expense({ amount: 1000 }),
    ]);
    expect(usage.usedAmount).toBe(1000);
  });
});

describe("computeProjectBouwdepotBalance", () => {
  it("computes balance from depot-linked expenses only", () => {
    const balance = computeProjectBouwdepotBalance(project, [], [expense()]);
    expect(balance.usedAmount).toBe(31500);
    expect(balance.remainingAmount).toBe(8500);
    expect(balance.linkedTaskCount).toBe(1);
  });
});
