import { formatDisplayDate } from "@/lib/format/dateDisplay";
import type { Task } from "@/lib/renovation/types";

function addCalendarDays(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

export function taskSpanDays(durationDays: number): number {
  if (durationDays > 0) return durationDays;
  return 1;
}

export function taskEndDate(task: Task): string | null {
  if (!task.startDate) return null;
  return addCalendarDays(task.startDate, taskSpanDays(task.durationDays) - 1);
}

export function formatTaskDateRange(
  start: string | null,
  end: string | null,
  t: (key: string, params?: Record<string, string>) => string
): string {
  if (start && end) {
    return t("rooms.dateRange", { start: formatDisplayDate(start), end: formatDisplayDate(end) });
  }
  if (start) {
    return t("rooms.dateOpen", { start: formatDisplayDate(start) });
  }
  return t("planning.noDate");
}

/** Sort key: start_date ASC, nulls last */
export function compareTasksByStartDate(a: Task, b: Task): number {
  if (!a.startDate && !b.startDate) return a.sortOrder - b.sortOrder;
  if (!a.startDate) return 1;
  if (!b.startDate) return -1;
  const cmp = a.startDate.localeCompare(b.startDate);
  return cmp !== 0 ? cmp : a.sortOrder - b.sortOrder;
}
