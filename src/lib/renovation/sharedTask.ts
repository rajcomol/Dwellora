import type { ID, Task } from "@/lib/renovation/types";

export function isSharedTask(task: Pick<Task, "roomIds">): boolean {
  return (task.roomIds?.length ?? 0) > 1;
}

export function otherRoomNamesForTask(
  task: Pick<Task, "roomIds">,
  currentRoomId: ID,
  roomNameById: ReadonlyMap<ID, string>
): string[] {
  return task.roomIds
    .filter((rid) => rid !== currentRoomId)
    .map((rid) => roomNameById.get(rid))
    .filter((name): name is string => Boolean(name));
}

/** One row per task id — safe for planning totals and dashboard counts. */
export function uniqueTasksById(tasks: Task[]): Task[] {
  const seen = new Set<string>();
  const out: Task[] = [];
  for (const task of tasks) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    out.push(task);
  }
  return out;
}
