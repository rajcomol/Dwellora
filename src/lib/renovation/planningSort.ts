import { phaseRank } from "@/lib/renovation/phases";
import type { ID, Room, Task } from "@/lib/renovation/types";

/**
 * Planning order (project hub + planning page):
 * 1. Task renovation phase (Slopen → … → Nazorg).
 * 2. Within phase: sortOrder, then title.
 */
export function compareTasksForPlanning(a: Task, b: Task): number {
  const pr = phaseRank(a.renovationPhase) - phaseRank(b.renovationPhase);
  if (pr !== 0) return pr;

  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.title.localeCompare(b.title);
}

export function sortTasksForPlanning(tasks: Task[]): Task[] {
  return [...tasks].sort(compareTasksForPlanning);
}

export function roomMapById(rooms: Room[]): Map<ID, Room> {
  return new Map(rooms.map((r) => [r.id, r]));
}
