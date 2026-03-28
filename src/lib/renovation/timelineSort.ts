import type { Task } from "@/lib/renovation/types";

export function compareTasksTimeline(a: Task, b: Task): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  const ad = a.startDate ?? "";
  const bd = b.startDate ?? "";
  if (ad !== bd) return ad.localeCompare(bd);
  return a.title.localeCompare(b.title);
}

export function sortTasksByTimeline(tasks: Task[]): Task[] {
  return [...tasks].sort(compareTasksTimeline);
}
