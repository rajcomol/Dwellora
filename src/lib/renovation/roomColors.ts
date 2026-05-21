import type { ID } from "@/lib/renovation/types";

const ROOM_BAR_COLORS = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-fuchsia-500",
  "bg-lime-600",
  "bg-blue-600",
] as const;

export const LOOSE_TASK_BAR_CLASS = "bg-zinc-400 dark:bg-zinc-500";

function hashRoomId(roomId: string): number {
  let h = 0;
  for (let i = 0; i < roomId.length; i++) {
    h = (h * 31 + roomId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function roomBarColorClass(roomId: ID | null): string {
  if (!roomId) return LOOSE_TASK_BAR_CLASS;
  return ROOM_BAR_COLORS[hashRoomId(roomId) % ROOM_BAR_COLORS.length]!;
}

export function buildRoomColorMap(roomIds: ID[]): Map<ID, string> {
  const map = new Map<ID, string>();
  for (const id of roomIds) {
    map.set(id, roomBarColorClass(id));
  }
  return map;
}
