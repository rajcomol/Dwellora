"use client";

import Link from "next/link";
import { appendProjectQuery } from "@/components/layout/tab-nav-config";
import { useI18n } from "@/i18n/provider";
import {
  deriveRoomStatus,
  roomStatusBadgeClass,
  roomStatusLabelKey,
} from "@/lib/dashboard/roomStatus";
import type { RoomTaskSummaryRow } from "@/lib/dashboard/roomOverview";
import { formatCurrency } from "@/lib/format/currency";
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import type { Task, TaskStatus } from "@/lib/renovation/types";

function statusDotClass(status: TaskStatus): string {
  switch (status) {
    case "done":
      return "bg-emerald-500";
    case "doing":
      return "bg-amber-500";
    default:
      return "bg-zinc-400";
  }
}

type Props = {
  summary: RoomTaskSummaryRow;
  roomName: string;
  previewTasks: Task[];
  projectId: string;
};

export default function RoomOverviewCard({ summary, roomName, previewTasks, projectId }: Props) {
  const { t } = useI18n();
  const taskCount = summary.task_count;
  const completed = summary.completed_count;
  const progress = taskCount > 0 ? Math.round((completed / taskCount) * 100) : 0;
  const statuses = previewTasks.map((tk) => tk.status);
  const roomStatus = deriveRoomStatus(taskCount, completed, statuses);

  const datePill =
    summary.earliest_start_date && summary.latest_end_date
      ? `${formatDisplayDate(summary.earliest_start_date)} – ${formatDisplayDate(summary.latest_end_date)}`
      : summary.earliest_start_date
        ? t("rooms.dateOpen", { start: formatDisplayDate(summary.earliest_start_date) })
        : null;

  const href = appendProjectQuery(`/dashboard/rooms/${summary.room_id}`, projectId);

  return (
    <Link
      href={href}
      className="flex flex-col rounded-xl border border-renovation-border bg-renovation-elevated p-4 shadow-renovation-card transition-shadow hover:shadow-md dark:border-renovation-border dark:bg-renovation-elevated"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{roomName}</h2>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${roomStatusBadgeClass(roomStatus)}`}
        >
          {t(roomStatusLabelKey(roomStatus))}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-renovation-muted dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-renovation-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {previewTasks.length === 0 ? (
          <li className="text-xs text-renovation-concrete">{t("rooms.noTasksPreview")}</li>
        ) : (
          previewTasks.map((tk) => (
            <li key={tk.id} className="flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(tk.status)}`} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-200">{tk.title}</span>
              <span className="shrink-0 text-xs tabular-nums text-renovation-concrete">
                {tk.estimatedCost != null ? formatCurrency(tk.estimatedCost) : "—"}
              </span>
            </li>
          ))
        )}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-renovation-muted px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {t("rooms.completedPill", { done: completed, total: taskCount })}
        </span>
        {datePill ? (
          <span className="rounded-full bg-renovation-muted px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {datePill}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function previewTasksForRoom(tasks: Task[], roomId: string, limit = 3): Task[] {
  return tasks
    .filter((tk) => tk.roomIds.includes(roomId))
    .sort((a, b) => {
      if (!a.startDate && !b.startDate) return a.title.localeCompare(b.title);
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return a.startDate.localeCompare(b.startDate);
    })
    .slice(0, limit);
}
