import { phaseRank } from "@/lib/renovation/phases";
import type { ID, Room, Task } from "@/lib/renovation/types";

/**
 * Planning order (project hub + planning page):
 * 1. Task renovation phase (Slopen → … → Nazorg).
 * 2. Within phase: tasks with startDate first (ISO ascending), then tasks without date (sortOrder, title).
 * 3. Tie-break: sortOrder, then title.
 */
export function compareTasksForPlanning(a: Task, b: Task): number {
  const pr = phaseRank(a.renovationPhase) - phaseRank(b.renovationPhase);
  if (pr !== 0) return pr;

  const ad = a.startDate;
  const bd = b.startDate;
  const aHas = Boolean(ad);
  const bHas = Boolean(bd);
  if (aHas !== bHas) return aHas ? -1 : 1;
  if (aHas && bHas && ad !== bd) return ad!.localeCompare(bd!);
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.title.localeCompare(b.title);
}

export function sortTasksForPlanning(tasks: Task[]): Task[] {
  return [...tasks].sort(compareTasksForPlanning);
}

export function roomMapById(rooms: Room[]): Map<ID, Room> {
  return new Map(rooms.map((r) => [r.id, r]));
}
