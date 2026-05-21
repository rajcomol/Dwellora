import { describe, expect, it } from "vitest";
import { computeMetrics } from "@/lib/dashboard/insights";
import { DEFAULT_RENOVATION_PHASE } from "@/lib/renovation/phases";
import type { Project, Task } from "@/lib/renovation/types";

const sampleProject: Project = {
  id: "p1",
  name: "Test",
  totalBudget: 1000,
  address: "",
  expectedKeyHandover: null,
  notes: "",
};

const sampleTask = (overrides: Partial<Task> = {}): Task => ({
  id: "t1",
  projectId: "p1",
  title: "A",
  roomIds: ["r1"],
  constructionDepotId: null,
  status: "todo",
  estimatedCost: 100,
  actualCost: 40,
  durationDays: 1,
  priority: "medium",
  description: "",
  sortOrder: 0,
  startDate: null,
  assignedRosterId: null,
  renovationPhase: DEFAULT_RENOVATION_PHASE,
  ...overrides,
});

describe("computeMetrics", () => {
  it("sums actual task costs and recorded spend includes loose expenses", () => {
    const tasks: Task[] = [sampleTask({ actualCost: 50 }), sampleTask({ id: "t2", actualCost: 25 })];
    const m = computeMetrics([sampleProject], tasks, []);
    expect(m.totalActualFromTasks).toBe(75);
    expect(m.totalActualRecordedSpend).toBe(75);
    expect(m.estimateVsActualGap).toBe(200 - 75);
  });

  it("adds project expenses to total recorded spend", () => {
    const tasks: Task[] = [sampleTask({ actualCost: 10 })];
    const m = computeMetrics([sampleProject], tasks, [
      {
        id: "e1",
        projectId: "p1",
        title: "Bouwmarkt",
        amount: 40,
        spentOn: "2025-03-01",
        notes: "",
        createdAt: "2025-03-01T12:00:00Z",
      },
    ]);
    expect(m.totalLooseExpenses).toBe(40);
    expect(m.totalActualRecordedSpend).toBe(50);
    expect(m.estimateVsActualGap).toBe(100 - 50);
  });
});
