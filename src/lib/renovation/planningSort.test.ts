import { describe, expect, it } from "vitest";
import { DEFAULT_RENOVATION_PHASE } from "@/lib/renovation/phases";
import { sortTasksForPlanning } from "@/lib/renovation/planningSort";
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

describe("sortTasksForPlanning", () => {
  it("orders by task phase first", () => {
    const a = task({
      id: "a",
      title: "A",
      roomIds: ["r1"],
      sortOrder: 0,
      renovationPhase: "nazorg",
    });
    const b = task({
      id: "b",
      title: "B",
      roomIds: ["r2"],
      sortOrder: 99,
      renovationPhase: "slopen",
    });
    expect(sortTasksForPlanning([a, b]).map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("within phase: dated tasks before undated, then sortOrder", () => {
    const undatedEarly = task({ id: "u0", title: "U0", roomIds: ["r"], sortOrder: 0, startDate: null });
    const dated = task({ id: "d", title: "D", roomIds: ["r"], sortOrder: 99, startDate: "2025-01-02" });
    const undatedLate = task({ id: "u1", title: "U1", roomIds: ["r"], sortOrder: 1, startDate: null });
    expect(sortTasksForPlanning([undatedEarly, dated, undatedLate]).map((t) => t.id)).toEqual([
      "d",
      "u0",
      "u1",
    ]);
  });

  it("within phase with dates: ascending by startDate", () => {
    const t2 = task({ id: "2", title: "B", roomIds: ["r"], startDate: "2025-02-01", sortOrder: 0 });
    const t1 = task({ id: "1", title: "A", roomIds: ["r"], startDate: "2025-01-01", sortOrder: 1 });
    expect(sortTasksForPlanning([t2, t1]).map((t) => t.id)).toEqual(["1", "2"]);
  });
});
