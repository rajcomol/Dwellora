import { describe, expect, it } from "vitest";
import { DEFAULT_RENOVATION_PHASE } from "@/lib/renovation/phases";
import { sortTasksForPlanning } from "@/lib/renovation/planningSort";
import type { Task } from "@/lib/renovation/types";

function task(partial: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return {
    projectId: "p1",
    roomIds: ["r"],
    status: "todo",
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

  it("within phase: sortOrder then title", () => {
    const late = task({ id: "u1", title: "U1", roomIds: ["r"], sortOrder: 1 });
    const early = task({ id: "u0", title: "U0", roomIds: ["r"], sortOrder: 0 });
    expect(sortTasksForPlanning([late, early]).map((t) => t.id)).toEqual(["u0", "u1"]);
  });
});
