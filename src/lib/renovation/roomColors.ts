import type { ID } from "@/lib/renovation/types";

/** Vaste kleuren voor veelvoorkomende ruimtenamen (case-insensitive). */
const NAMED_ROOM_COLORS: Record<string, string> = {
  woonkamer: "bg-amber-500",
  keuken: "bg-orange-400",
  badkamer: "bg-yellow-500",
  slaapkamer: "bg-amber-300",
};

/** Palette voor overige ruimtes (index op gesorteerde room_id-lijst). */
const ROOM_COLOR_PALETTE = [
  "bg-amber-500",
  "bg-orange-400",
  "bg-yellow-500",
  "bg-amber-300",
  "bg-orange-300",
] as const;

export const LOOSE_TASK_BAR_CLASS = "bg-renovation-muted";

function hashRoomId(roomId: string): number {
  let h = 0;
  for (let i = 0; i < roomId.length; i++) {
    h = (h * 31 + roomId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function roomBarColorClass(
  roomId: ID | null,
  roomName?: string,
  orderedRoomIds?: ID[]
): string {
  if (!roomId) return LOOSE_TASK_BAR_CLASS;

  const normalized = roomName?.trim().toLowerCase();
  if (normalized && NAMED_ROOM_COLORS[normalized]) {
    return NAMED_ROOM_COLORS[normalized]!;
  }

  if (orderedRoomIds && orderedRoomIds.length > 0) {
    const idx = orderedRoomIds.indexOf(roomId);
    const paletteIndex = idx >= 0 ? idx : hashRoomId(roomId);
    return ROOM_COLOR_PALETTE[paletteIndex % ROOM_COLOR_PALETTE.length]!;
  }

  return ROOM_COLOR_PALETTE[hashRoomId(roomId) % ROOM_COLOR_PALETTE.length]!;
}

export function buildRoomColorMap(
  roomIds: ID[],
  roomNameById?: Map<ID, string>
): Map<ID, string> {
  const ordered = [...roomIds].sort();
  const map = new Map<ID, string>();
  for (const id of ordered) {
    map.set(id, roomBarColorClass(id, roomNameById?.get(id), ordered));
  }
  return map;
}

/** Tekstkleur op gekleurde badges/balken */
export function roomBarTextClass(colorClass: string): string {
  if (colorClass === "bg-amber-300" || colorClass === "bg-yellow-500") {
    return "text-amber-950";
  }
  return "text-white";
}
