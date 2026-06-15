"use client";

import Link from "next/link";
import { useMemo } from "react";
import RoomTaskForm from "@/components/dashboard/RoomTaskForm";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { appendProjectQuery } from "@/components/layout/tab-nav-config";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/i18n/provider";
import { deriveRoomStatus, roomStatusBadgeClass, roomStatusLabelKey } from "@/lib/dashboard/roomStatus";
import { sortTasksForPlanning } from "@/lib/renovation/planningSort";
import { DEFAULT_RENOVATION_PHASE } from "@/lib/renovation/phases";

type Props = { roomId: string };

export default function RoomDetailPageClient({ roomId }: Props) {
  const { t } = useI18n();
  const { selectedProjectId } = useSelectedProject();
  const { rooms, tasks, teamRoster, createTask, deleteRoom, deleteTask, updateTask, isRenovationDataReady } =
    useRenovation();

  const room = useMemo(() => rooms.find((r) => r.id === roomId), [rooms, roomId]);
  const roomTasks = useMemo(
    () => (room ? sortTasksForPlanning(tasks.filter((tk) => tk.roomIds.includes(room.id))) : []),
    [room, tasks]
  );
  const rosterOptions = useMemo(
    () => (room ? teamRoster.filter((r) => r.projectId === room.projectId) : []),
    [room, teamRoster]
  );

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
        <Link href={roomsHref} className="text-sm font-medium text-renovation-steel hover:underline">
          ← {t("rooms.detail.back")}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{room.name}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roomStatusBadgeClass(roomStatus)}`}>
            {t(roomStatusLabelKey(roomStatus))}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-renovation-concrete">
          {t("rooms.completedPill", { done: completed, total: roomTasks.length })}
        </p>
      </div>

      <ul className="space-y-2">
        {roomTasks.length === 0 ? (
          <li className="text-sm text-renovation-concrete">{t("rooms.noTasksPreview")}</li>
        ) : (
          roomTasks.map((tk) => (
            <RoomTaskForm
              key={tk.id}
              mode="edit"
              task={tk}
              rosterOptions={rosterOptions}
              onSubmit={async (values) =>
                updateTask({
                  id: values.id,
                  title: values.title,
                  durationDays: values.durationDays,
                  priority: values.priority,
                  renovationPhase: values.renovationPhase,
                  status: values.status,
                  assignedRosterId: values.assignedRosterId,
                  description: values.description,
                })
              }
              onDelete={() => {
                if (typeof window !== "undefined" && window.confirm(`${t("common.delete")}?`)) {
                  deleteTask(tk.id);
                }
              }}
            />
          ))
        )}
      </ul>

      <RoomTaskForm
        mode="create"
        roomId={room.id}
        projectId={room.projectId}
        rosterOptions={rosterOptions}
        onSubmit={async (values) =>
          createTask({
            title: values.title,
            projectId: room.projectId,
            roomIds: [room.id],
            status: values.status,
            durationDays: values.durationDays,
            priority: values.priority,
            renovationPhase: values.renovationPhase ?? DEFAULT_RENOVATION_PHASE,
            description: values.description,
            assignedRosterId: values.assignedRosterId,
          })
        }
      />

      <div className="flex flex-wrap gap-3">
        <Link
          href={appendProjectQuery("/dashboard/finances", room.projectId)}
          className="text-sm font-medium text-renovation-steel underline dark:text-renovation-accent"
        >
          {t("rooms.detail.viewRoomFinances")}
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
