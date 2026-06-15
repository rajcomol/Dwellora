import { describe, expect, it } from "vitest";
import { computeProjectSpendOverview, looseExpensesForBudget } from "@/lib/dashboard/projectBudget";
import { DEFAULT_RENOVATION_PHASE } from "@/lib/renovation/phases";
import type { Project, ProjectExpense } from "@/lib/renovation/types";

const project: Project = {
  id: "p1",
  name: "Test",
  totalBudget: 30000,
  ownContribution: 10000,
  constructionDepotTotal: 20000,
  address: "",
  expectedKeyHandover: null,
  planningStartDate: null,
  notes: "",
};

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
    kostType: "werkelijk",
    categorie: "overig",
    bouwdepotStatus: "open",
    ...overrides,
  };
}

describe("computeProjectSpendOverview", () => {
  it("splits usage between own money and bouwdepot from kostenposten", () => {
    const overview = computeProjectSpendOverview(project, [
      expense({ id: "e1", amount: 400, fundedByConstructionDepot: false }),
      expense({ id: "e2", amount: 600, fundedByConstructionDepot: true }),
    ]);

    expect(overview.ownUsed).toBe(400);
    expect(overview.ownRemaining).toBe(9600);
    expect(overview.depotUsed).toBe(600);
    expect(overview.depotRemaining).toBe(19400);
    expect(overview.totalSpent).toBe(1000);
    expect(overview.remainingBudget).toBe(29000);
  });

  it("sums all kostenposten for total spent", () => {
    const overview = computeProjectSpendOverview(project, [
      expense({ id: "e1", amount: 500, taskId: "t1" }),
      expense({ id: "e2", amount: 300, taskId: null }),
    ]);
    expect(overview.totalSpent).toBe(800);
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
