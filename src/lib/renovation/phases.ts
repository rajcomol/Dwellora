/**
 * Fixed renovation phases per room. Order defines planning sort (earlier = first).
 * DB column: tasks.renovation_phase
 */
export const RENOVATION_PHASE_ORDER = [
  "slopen",
  "ruwbouw",
  "installaties",
  "afbouw",
  "inrichting",
  "nazorg",
] as const;

export type RenovationPhase = (typeof RENOVATION_PHASE_ORDER)[number];

export const DEFAULT_RENOVATION_PHASE: RenovationPhase = "slopen";

const PHASE_RANK = new Map<string, number>(
  RENOVATION_PHASE_ORDER.map((p, i) => [p, i])
);

/** Rank for sorting: lower = earlier in the build. Unknown values sort last. */
export function phaseRank(phase: string | null | undefined): number {
  if (phase == null || phase === "") return Number.MAX_SAFE_INTEGER;
  return PHASE_RANK.get(phase) ?? Number.MAX_SAFE_INTEGER;
}

/** Map a DB/raw string to a known phase; invalid → default (for display and edits). */
export function parseRenovationPhase(raw: unknown): RenovationPhase {
  if (typeof raw === "string" && PHASE_RANK.has(raw)) {
    return raw as RenovationPhase;
  }
  return DEFAULT_RENOVATION_PHASE;
}

export function isRenovationPhase(value: string): value is RenovationPhase {
  return PHASE_RANK.has(value);
}
