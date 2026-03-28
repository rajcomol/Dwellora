import { describe, expect, it } from "vitest";
import { DEFAULT_RENOVATION_PHASE } from "@/lib/renovation/phases";
import { compareTasksTimeline, sortTasksByTimeline } from "@/lib/renovation/timelineSort";
import type { Task } from "@/lib/renovation/types";

function task(partial: Partial<Task> & Pick<Task, "id" | "title" | "roomId">): Task {
  return {
    status: "todo",
    estimatedCost: 0,
    actualCost: 0,
    durationDays: 1,
    priority: "medium",
    description: "",
    sortOrder: 0,
    startDate: null,
    assignedRosterId: null,
    renovationPhase: DEFAULT_RENOVATION_PHASE,
    ...partial,
  };
}

describe("sortTasksByTimeline", () => {
  it("orders by sortOrder, then startDate, then title", () => {
    const a = task({ id: "a", title: "B", roomId: "r", sortOrder: 1, startDate: "2025-01-02" });
    const b = task({ id: "b", title: "A", roomId: "r", sortOrder: 1, startDate: "2025-01-01" });
    const c = task({ id: "c", title: "Z", roomId: "r", sortOrder: 0 });
    expect(sortTasksByTimeline([a, b, c]).map((t) => t.id)).toEqual(["c", "b", "a"]);
  });

  it("compareTasksTimeline is stable for equal keys", () => {
    const x = task({ id: "x", title: "same", roomId: "r", sortOrder: 0, startDate: null });
    const y = task({ id: "y", title: "same", roomId: "r", sortOrder: 0, startDate: null });
    expect(compareTasksTimeline(x, y)).toBe(0);
  });
});
