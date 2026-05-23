import { describe, expect, it } from "vitest";
import { DEFAULT_RENOVATION_PHASE } from "@/lib/renovation/phases";
import { buildPlanningRows } from "@/lib/renovation/planningSchedule";
import type { Task } from "@/lib/renovation/types";

function task(partial: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    projectId: "p1",
    roomIds: ["r"],
    status: "todo",
    estimatedCost: 0,
    actualCost: 0,
    durationDays: 1,
    priority: "medium",
    description: "",
    sortOrder: 0,
    startDate: null,
    assignedRosterId: null,
    fundedByConstructionDepot: false,
    renovationPhase: DEFAULT_RENOVATION_PHASE,
    ...partial,
  };
}

describe("buildPlanningRows", () => {
  it("sums cumulative days and remaining for open tasks", () => {
    const t1 = task({ id: "1", title: "A", roomIds: ["r"], sortOrder: 0, durationDays: 3, status: "todo" });
    const t2 = task({ id: "2", title: "B", roomIds: ["r"], sortOrder: 1, durationDays: 2, status: "done" });
    const { rows, totalDays, remainingDays } = buildPlanningRows([t2, t1]);
    expect(totalDays).toBe(5);
    expect(remainingDays).toBe(3);
    expect(rows[0].dayStart).toBe(1);
    expect(rows[0].dayEnd).toBe(3);
    expect(rows[1].dayStart).toBe(4);
    expect(rows[1].dayEnd).toBe(5);
  });

  it("adds indicative dates when first sorted task has startDate", () => {
    const t1 = task({ id: "1", title: "A", roomIds: ["r"], sortOrder: 0, durationDays: 2, startDate: "2025-06-01" });
    const t2 = task({ id: "2", title: "B", roomIds: ["r"], sortOrder: 1, durationDays: 1, startDate: null });
    const { rows } = buildPlanningRows([t1, t2]);
    expect(rows[0].estimatedStart).toBe("2025-06-01");
    expect(rows[0].estimatedEnd).toBe("2025-06-02");
    expect(rows[1].estimatedStart).toBe("2025-06-03");
    expect(rows[1].estimatedEnd).toBe("2025-06-03");
  });
});
