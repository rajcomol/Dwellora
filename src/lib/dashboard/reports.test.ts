import { describe, expect, it } from "vitest";
import { aggregateSpendByRoom, projectBudgetSummary } from "@/lib/dashboard/reports";
import { DEFAULT_RENOVATION_PHASE } from "@/lib/renovation/phases";
import type { Project, ProjectExpense, Room, Task } from "@/lib/renovation/types";

function task(partial: Partial<Task>): Task {
  return {
    id: "t",
    title: "t",
    roomId: "r",
    status: "todo",
    estimatedCost: 0,
    actualCost: 0,
    durationDays: 1,
    priority: "low",
    description: "",
    sortOrder: 0,
    startDate: null,
    assignedRosterId: null,
    renovationPhase: DEFAULT_RENOVATION_PHASE,
    ...partial,
  };
}

const sampleProject: Project = {
  id: "p1",
  name: "P",
  totalBudget: 1000,
  address: "",
  expectedKeyHandover: null,
  notes: "",
};

describe("aggregateSpendByRoom", () => {
  it("groups by room", () => {
    const rooms: Room[] = [
      { id: "r1", name: "Keuken", projectId: "p1" },
      { id: "r2", name: "Badkamer", projectId: "p1" },
    ];
    const rows = aggregateSpendByRoom(
      [
        task({ roomId: "r1", estimatedCost: 100, actualCost: 80 }),
        task({ roomId: "r1", estimatedCost: 50, actualCost: 40 }),
        task({ roomId: "r2", estimatedCost: 30, actualCost: 10 }),
      ],
      rooms
    );
    const k = rows.find((r) => r.roomId === "r1");
    expect(k?.taskCount).toBe(2);
    expect(k?.estimated).toBe(150);
    expect(k?.actual).toBe(120);
  });
});

describe("projectBudgetSummary", () => {
  it("includes loose expenses in total actual", () => {
    const expenses: ProjectExpense[] = [
      {
        id: "e1",
        projectId: "p1",
        title: "Gamma",
        amount: 25,
        spentOn: null,
        notes: "",
        createdAt: "",
      },
    ];
    const s = projectBudgetSummary(sampleProject, [task({ actualCost: 50 })], expenses);
    expect(s.totalActualFromTasks).toBe(50);
    expect(s.totalLooseExpenses).toBe(25);
    expect(s.totalActual).toBe(75);
  });
});
