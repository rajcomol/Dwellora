"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { appendProjectQuery } from "@/components/layout/tab-nav-config";
import Button from "@/components/ui/Button";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/i18n/provider";
import { deriveRoomStatus, roomStatusBadgeClass, roomStatusLabelKey } from "@/lib/dashboard/roomStatus";
import { formatCurrency } from "@/lib/format/currency";
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import { sortTasksForPlanning } from "@/lib/renovation/planningSort";
import { taskEndDate } from "@/lib/renovation/taskDates";
import type { TaskStatus } from "@/lib/renovation/types";
import { DEFAULT_RENOVATION_PHASE } from "@/lib/renovation/phases";

type Props = { roomId: string };

export default function RoomDetailPageClient({ roomId }: Props) {
  const { t } = useI18n();
  const { selectedProjectId } = useSelectedProject();
  const { rooms, tasks, createTask, deleteRoom, deleteTask, updateTask, isRenovationDataReady } =
    useRenovation();

  const room = useMemo(() => rooms.find((r) => r.id === roomId), [rooms, roomId]);
  const roomTasks = useMemo(
    () => (room ? sortTasksForPlanning(tasks.filter((tk) => tk.roomIds.includes(room.id))) : []),
    [room, tasks]
  );

  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const completed = roomTasks.filter((tk) => tk.status === "done").length;
  const roomStatus = deriveRoomStatus(
    roomTasks.length,
    completed,
    roomTasks.map((tk) => tk.status)
  );

  if (!isRenovationDataReady) {
    return <DashboardPageSkeleton />;
  }

  if (!room) {
    return (
      <p className="text-sm text-renovation-concrete">
        {t("rooms.detail.notFound")}{" "}
        <Link href={appendProjectQuery("/dashboard/rooms", selectedProjectId)} className="underline">
          {t("rooms.detail.back")}
        </Link>
      </p>
    );
  }

  const roomsHref = appendProjectQuery("/dashboard/rooms", room.projectId);

  return (
    <div className="space-y-6">
      <div>
        <Link href={roomsHref} className="text-sm font-medium text-renovation-steel hover:underline dark:text-renovation-accent">
          ← {t("rooms.detail.back")}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{room.name}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roomStatusBadgeClass(roomStatus)}`}>
            {t(roomStatusLabelKey(roomStatus))}
          </span>
        </div>
        <p className="mt-1 text-sm text-renovation-concrete">
          {t("rooms.completedPill", { done: completed, total: roomTasks.length })}
        </p>
      </div>

      <ul className="space-y-2">
        {roomTasks.length === 0 ? (
          <li className="text-sm text-renovation-concrete">{t("rooms.noTasksPreview")}</li>
        ) : (
          roomTasks.map((tk) => (
            <li
              key={tk.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-renovation-border px-4 py-3 dark:border-renovation-border"
            >
              <div>
                <div className="font-medium">{tk.title}</div>
                <div className="text-xs text-renovation-concrete">
                  {t(`task.status.${tk.status}`)}
                  {tk.estimatedCost != null ? ` • ${formatCurrency(tk.estimatedCost)}` : ""}
                  {tk.startDate
                    ? ` • ${formatDisplayDate(tk.startDate)}${taskEndDate(tk) ? ` – ${formatDisplayDate(taskEndDate(tk)!)}` : ""}`
                    : ""}
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  className="rounded border border-renovation-border bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                  value={tk.status}
                  onChange={(e) => {
                    void updateTask({ id: tk.id, status: e.target.value as TaskStatus });
                  }}
                  aria-label={t("planning.gantt.editTask")}
                >
                  <option value="todo">{t("task.status.todo")}</option>
                  <option value="doing">{t("task.status.doing")}</option>
                  <option value="done">{t("task.status.done")}</option>
                </select>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline dark:text-red-400"
                  onClick={() => {
                    if (typeof window !== "undefined" && window.confirm(`${t("common.delete")}?`)) {
                      deleteTask(tk.id);
                    }
                  }}
                >
                  {t("common.delete")}
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      <form
        className="space-y-3 rounded-xl border border-renovation-border bg-renovation-elevated p-4 dark:border-renovation-border dark:bg-renovation-elevated"
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = title.trim();
          if (!trimmed) {
            setError(t("validation.generic"));
            return;
          }
          setError(null);
          createTask({
            title: trimmed,
            projectId: room.projectId,
            roomIds: [room.id],
            status: "todo",
            estimatedCost: null,
            durationDays: 1,
            priority: "medium",
            renovationPhase: DEFAULT_RENOVATION_PHASE,
          });
          setTitle("");
        }}
      >
        <h2 className="text-sm font-semibold">{t("projectDetail.addTask")}</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("projectDetail.taskTitlePlaceholder")}
          className="w-full rounded-lg border border-renovation-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <Button type="submit">{t("common.save")}</Button>
      </form>

      <div className="flex flex-wrap gap-3">
        <Link
          href={appendProjectQuery(`/dashboard/rooms?tab=overzicht`, room.projectId)}
          className="text-sm font-medium text-renovation-steel underline dark:text-renovation-accent"
        >
          {t("rooms.fullProjectView")}
        </Link>
        <button
          type="button"
          className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
          onClick={() => {
            if (typeof window !== "undefined" && window.confirm(t("rooms.deleteConfirm"))) {
              deleteRoom(room.id);
              window.location.href = roomsHref;
            }
          }}
        >
          {t("common.delete")} {t("nav.tabs.rooms").toLowerCase()}
        </button>
      </div>
    </div>
  );
}
