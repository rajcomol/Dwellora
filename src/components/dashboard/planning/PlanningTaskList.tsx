"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/provider";
import { sortTasksForPlanning } from "@/lib/renovation/planningSort";
import type { PlanningRow } from "@/lib/renovation/planningSchedule";
import { LOOSE_TASK_BAR_CLASS, roomBarColorClass, roomBarTextClass } from "@/lib/renovation/roomColors";
import type { Task } from "@/lib/renovation/types";

type Props = {
  tasks: Task[];
  roomNameById: Map<string, string>;
  planningRows?: PlanningRow[];
  onTaskClick: (task: Task) => void;
};

function statusBadgeClass(status: Task["status"]): string {
  if (status === "done") {
    return "bg-renovation-muted text-renovation-concrete dark:bg-renovation-muted";
  }
  if (status === "doing") {
    return "bg-amber-500/20 text-amber-800 dark:bg-amber-500/25 dark:text-amber-200";
  }
  return "bg-renovation-muted text-renovation-concrete";
}

export default function PlanningTaskList({ tasks, roomNameById, planningRows = [], onTaskClick }: Props) {
  const { t } = useI18n();

  const rowByTaskId = useMemo(
    () => new Map(planningRows.map((row) => [row.task.id, row])),
    [planningRows]
  );

  const orderedRoomIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tk of tasks) {
      for (const rid of tk.roomIds) ids.add(rid);
    }
    return [...ids].sort();
  }, [tasks]);

  const sorted = useMemo(() => sortTasksForPlanning(tasks), [tasks]);

  if (sorted.length === 0) {
    return <p className="text-sm text-renovation-concrete">{t("planning.empty")}</p>;
  }

  return (
    <ul data-testid="planning-task-list" className="space-y-3">
      {sorted.map((tk) => {
        const primaryRoom = tk.roomIds[0];
        const roomLabel =
          tk.roomIds.length === 0
            ? t("planning.looseTask")
            : tk.roomIds
                .map((rid) => roomNameById.get(rid))
                .filter(Boolean)
                .join(", ") || t("planning.looseTask");
        const roomName = primaryRoom ? roomNameById.get(primaryRoom) : undefined;
        const roomColor =
          tk.roomIds.length === 0
            ? LOOSE_TASK_BAR_CLASS
            : roomBarColorClass(primaryRoom ?? null, roomName, orderedRoomIds);
        const roomTextColor = roomBarTextClass(roomColor);
        const row = rowByTaskId.get(tk.id);
        const dayLabel =
          row != null
            ? row.dayStart === row.dayEnd
              ? t("planning.daySingle", { n: row.dayStart })
              : t("planning.dayRange", { from: row.dayStart, to: row.dayEnd })
            : null;

        return (
          <li key={tk.id}>
            <button
              type="button"
              onClick={() => onTaskClick(tk)}
              className="w-full rounded-xl border border-renovation-border bg-renovation-elevated px-4 py-3 text-left shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 font-medium text-foreground">{tk.title}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(tk.status)}`}
                >
                  {t(`task.status.${tk.status}`)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roomColor} ${roomTextColor}`}
                >
                  {roomLabel}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-renovation-concrete">
                {dayLabel ? (
                  <span className="font-medium tabular-nums text-renovation-steel">{dayLabel}</span>
                ) : (
                  t("projectDetail.plannedDays", { days: tk.durationDays })
                )}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
