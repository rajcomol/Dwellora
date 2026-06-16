import { describe, expect, it } from "vitest";
import { isSharedTask, otherRoomNamesForTask, uniqueTasksById } from "@/lib/renovation/sharedTask";
import { DEFAULT_RENOVATION_PHASE } from "@/lib/renovation/phases";
import type { Task } from "@/lib/renovation/types";

function task(partial: Partial<Task> & Pick<Task, "id">): Task {
  return {
    projectId: "p1",
    title: "Taak",
    roomIds: ["r1"],
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

describe("sharedTask helpers", () => {
  it("detects shared tasks", () => {
    expect(isSharedTask(task({ id: "1", roomIds: ["r1"] }))).toBe(false);
    expect(isSharedTask(task({ id: "2", roomIds: ["r1", "r2"] }))).toBe(true);
  });

  it("lists other room names for the current room", () => {
    const names = new Map([
      ["r1", "Keuken"],
      ["r2", "Badkamer"],
    ]);
    expect(otherRoomNamesForTask(task({ id: "1", roomIds: ["r1", "r2"] }), "r1", names)).toEqual(["Badkamer"]);
    expect(otherRoomNamesForTask(task({ id: "1", roomIds: ["r1"] }), "r1", names)).toEqual([]);
  });

  it("deduplicates tasks by id", () => {
    const t = task({ id: "1", roomIds: ["r1", "r2"] });
    const dup = task({ id: "1", roomIds: ["r2"] });
    expect(uniqueTasksById([t, dup])).toHaveLength(1);
  });
});
