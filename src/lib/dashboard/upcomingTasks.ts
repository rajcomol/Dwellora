import type { Project, Room, Task, TaskPriority } from "@/lib/renovation/types";

const priorityRank: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export type UpcomingTaskView = Task & {
  projectName: string;
  roomName: string;
};

/**
 * Open work: todo + doing, highest priority first, then start date, then title.
 */
export function getUpcomingTasks(
  projects: Project[],
  rooms: Room[],
  tasks: Task[],
  limit = 12
): UpcomingTaskView[] {
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const open = tasks.filter((t) => t.status === "todo" || t.status === "doing");
  const sorted = [...open].sort((a, b) => {
    const pr = priorityRank[a.priority] - priorityRank[b.priority];
    if (pr !== 0) return pr;
    const ad = a.startDate ?? "";
    const bd = b.startDate ?? "";
    if (ad !== bd) return ad.localeCompare(bd);
    return a.title.localeCompare(b.title);
  });
  return sorted.slice(0, limit).map((t) => {
    const names = t.roomIds
      .map((rid) => roomById.get(rid)?.name)
      .filter((n): n is string => Boolean(n));
    const pid = t.projectId;
    const roomName =
      names.length === 0
        ? "Los"
        : names.length <= 2
          ? names.join(", ")
          : `${names[0]}, ${names[1]} +${names.length - 2}`;
    return {
      ...t,
      projectName: projectName.get(pid) ?? "—",
      roomName,
    };
  });
}
