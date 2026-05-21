import type { Task, TaskStatus } from "@/lib/renovation/types";

export type RoomDisplayStatus = "planned" | "inProgress" | "completed";

export function deriveRoomStatus(
  taskCount: number,
  completedCount: number,
  statuses: TaskStatus[]
): RoomDisplayStatus {
  if (taskCount === 0) return "planned";
  if (completedCount >= taskCount) return "completed";
  if (statuses.some((s) => s === "doing")) return "inProgress";
  if (completedCount > 0 && completedCount < taskCount) return "inProgress";
  return "planned";
}

export function roomStatusLabelKey(status: RoomDisplayStatus): string {
  switch (status) {
    case "completed":
      return "rooms.status.completed";
    case "inProgress":
      return "rooms.status.inProgress";
    default:
      return "rooms.status.planned";
  }
}

export function roomStatusBadgeClass(status: RoomDisplayStatus): string {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
    case "inProgress":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }
}
