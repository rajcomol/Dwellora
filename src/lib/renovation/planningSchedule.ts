import { sortTasksForPlanning } from "@/lib/renovation/planningSort";
import type { Task } from "@/lib/renovation/types";

export type PlanningRow = {
  task: Task;
  /** Inclusive day index along the timeline (1-based). */
  dayStart: number;
  /** Inclusive end day index. */
  dayEnd: number;
  /** Present only when the project has a planning start date. */
  estimatedStart?: string;
  estimatedEnd?: string;
};

function addCalendarDays(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

function spanDays(durationDays: number): number {
  if (durationDays > 0) return durationDays;
  return 1;
}

/**
 * Builds timeline rows with cumulative day ranges and optional indicative calendar dates
 * when the project has a `planningStartDate`.
 */
export function buildPlanningRows(
  tasks: Task[],
  planningStartDate: string | null = null
): {
  rows: PlanningRow[];
  totalDays: number;
  remainingDays: number;
} {
  const sorted = sortTasksForPlanning(tasks);
  const anchor = planningStartDate?.trim() || null;

  let cumulative = 0;
  let cursorDate: string | null = anchor;
  const rows: PlanningRow[] = [];

  for (const task of sorted) {
    const span = spanDays(task.durationDays);
    const dayStart = cumulative + 1;
    const dayEnd = cumulative + span;
    cumulative = dayEnd;

    const row: PlanningRow = { task, dayStart, dayEnd };
    if (anchor && cursorDate) {
      row.estimatedStart = cursorDate;
      row.estimatedEnd = addCalendarDays(cursorDate, span - 1);
      cursorDate = addCalendarDays(row.estimatedEnd, 1);
    }
    rows.push(row);
  }

  const totalDays = cumulative;
  const remainingDays = sorted
    .filter((t) => t.status === "todo" || t.status === "doing")
    .reduce((acc, t) => acc + spanDays(t.durationDays), 0);

  return { rows, totalDays, remainingDays };
}
