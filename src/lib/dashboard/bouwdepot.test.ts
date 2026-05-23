import { describe, expect, it } from "vitest";
import {
  computeProjectBouwdepotBalance,
  taskBouwdepotChargeAmount,
} from "@/lib/dashboard/bouwdepot";
import { DEFAULT_RENOVATION_PHASE } from "@/lib/renovation/phases";
import type { Project, Task } from "@/lib/renovation/types";

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
});
