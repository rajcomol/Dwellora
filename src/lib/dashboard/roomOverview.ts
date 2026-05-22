import { taskEndDate } from "@/lib/renovation/taskDates";
import type { Room, Task } from "@/lib/renovation/types";

export type RoomTaskSummaryRow = {
  room_id: string;
  project_id: string;
  room_name: string;
  task_count: number;
  completed_count: number;
  estimated_cost_sum: number;
  earliest_start_date: string | null;
  latest_end_date: string | null;
};

function compareTasksForPreview(a: Task, b: Task): number {
  if (!a.startDate && !b.startDate) return a.title.localeCompare(b.title);
  if (!a.startDate) return 1;
  if (!b.startDate) return -1;
  return a.startDate.localeCompare(b.startDate);
}

/** Tasks linked to a room via task_rooms (roomIds on Task). */
export function tasksForRoom(tasks: Task[], roomId: string): Task[] {
  return (tasks ?? []).filter((tk) => (tk.roomIds ?? []).includes(roomId));
}

export function previewTasksForRoom(tasks: Task[], roomId: string, limit = 3): Task[] {
  return [...tasksForRoom(tasks, roomId)].sort(compareTasksForPreview).slice(0, limit);
}

/** Client-side aggregates aligned with task_rooms (same source as preview list). */
export function buildRoomSummariesFromTasks(rooms: Room[], tasks: Task[]): RoomTaskSummaryRow[] {
  return (rooms ?? []).map((room) => {
    const roomTasks = tasksForRoom(tasks, room.id);
    let estimatedCostSum = 0;
    let earliest: string | null = null;
    let latest: string | null = null;

    for (const tk of roomTasks) {
      if (tk.estimatedCost != null) {
        estimatedCostSum += tk.estimatedCost;
      }
      if (tk.startDate) {
        if (!earliest || tk.startDate < earliest) earliest = tk.startDate;
        const end = taskEndDate(tk);
        if (end && (!latest || end > latest)) latest = end;
      }
    }

    return {
      room_id: room.id,
      project_id: room.projectId,
      room_name: room.name,
      task_count: roomTasks.length,
      completed_count: roomTasks.filter((tk) => tk.status === "done").length,
      estimated_cost_sum: estimatedCostSum,
      earliest_start_date: earliest,
      latest_end_date: latest,
    };
  });
}
