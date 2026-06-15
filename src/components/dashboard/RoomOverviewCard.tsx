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
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import type { Task } from "@/lib/renovation/types";

type Props = {
  summary: RoomTaskSummaryRow;
  roomName: string;
  roomTasks: Task[];
  previewTasks: Task[];
  projectId: string;
};

export default function RoomOverviewCard({
  summary,
  roomName,
  roomTasks,
  previewTasks,
  projectId,
}: Props) {
  const { t } = useI18n();
  const taskCount = summary.task_count;
  const completed = summary.completed_count;
  const progress = taskCount > 0 ? Math.round((completed / taskCount) * 100) : 0;
  const statuses = roomTasks.map((tk) => tk.status);
  const roomStatus = deriveRoomStatus(taskCount, completed, statuses);
  const hasTasks = taskCount > 0;
  const remainingPreview = Math.max(0, taskCount - previewTasks.length);

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
      data-testid="rooms-overview-card"
      className="flex flex-col rounded-xl border border-renovation-border bg-renovation-surface p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">{roomName}</h2>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${roomStatusBadgeClass(roomStatus)}`}
        >
          {t(roomStatusLabelKey(roomStatus))}
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-renovation-muted">
        <div
          className="h-full rounded-full bg-renovation-accent transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {hasTasks ? (
        <>
          <ul className="mt-4 space-y-1.5">
            {previewTasks.map((tk) => (
              <li key={tk.id} className="truncate text-sm text-foreground">
                {tk.title}
              </li>
            ))}
          </ul>
          {remainingPreview > 0 ? (
            <p className="mt-1 text-xs font-medium text-renovation-concrete">
              {t("rooms.moreTasksPreview", { count: remainingPreview })}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-renovation-muted px-2.5 py-0.5 text-xs font-medium text-renovation-concrete">
              {t("rooms.completedPill", { done: completed, total: taskCount })}
            </span>
            {datePill ? (
              <span className="rounded-full bg-renovation-muted px-2.5 py-0.5 text-xs font-medium text-renovation-concrete">
                {datePill}
              </span>
            ) : null}
          </div>
        </>
      ) : (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-renovation-concrete">{t("rooms.noTasksPreview")}</p>
          <span
            data-testid="rooms-add-task-link"
            className="mt-2 inline-block text-sm font-medium text-renovation-steel underline dark:text-renovation-accent"
          >
            {t("rooms.addTaskLink")}
          </span>
        </div>
      )}
    </Link>
  );
}
