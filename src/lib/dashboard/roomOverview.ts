import { buildPlanningRows } from "@/lib/renovation/planningSchedule";
import { compareTasksForPlanning } from "@/lib/renovation/planningSort";
import type { Room, Task } from "@/lib/renovation/types";

export type RoomTaskSummaryRow = {
  room_id: string;
  project_id: string;
  room_name: string;
  task_count: number;
  completed_count: number;
  earliest_start_date: string | null;
  latest_end_date: string | null;
};

/** Tasks linked to a room via task_rooms (roomIds on Task). */
export function tasksForRoom(tasks: Task[], roomId: string): Task[] {
  return (tasks ?? []).filter((tk) => (tk.roomIds ?? []).includes(roomId));
}

export function previewTasksForRoom(tasks: Task[], roomId: string, limit = 3): Task[] {
  return [...tasksForRoom(tasks, roomId)].sort(compareTasksForPlanning).slice(0, limit);
}

/** Client-side aggregates aligned with task_rooms (same source as preview list). */
export function buildRoomSummariesFromTasks(
  rooms: Room[],
  tasks: Task[],
  planningStartDate: string | null = null
): RoomTaskSummaryRow[] {
  const { rows } = buildPlanningRows(tasks, planningStartDate);
  const datesByTaskId = new Map(
    rows.map((row) => [row.task.id, { start: row.estimatedStart ?? null, end: row.estimatedEnd ?? null }])
  );

  return (rooms ?? []).map((room) => {
    const roomTasks = tasksForRoom(tasks, room.id);
    let earliest: string | null = null;
    let latest: string | null = null;

    for (const tk of roomTasks) {
      const dates = datesByTaskId.get(tk.id);
      if (dates?.start) {
        if (!earliest || dates.start < earliest) earliest = dates.start;
      }
      if (dates?.end) {
        if (!latest || dates.end > latest) latest = dates.end;
      }
    }

    return {
      room_id: room.id,
      project_id: room.projectId,
      room_name: room.name,
      task_count: roomTasks.length,
      completed_count: roomTasks.filter((tk) => tk.status === "done").length,
      earliest_start_date: earliest,
      latest_end_date: latest,
    };
  });
}
