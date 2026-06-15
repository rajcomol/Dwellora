"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { barPositionPercentForDates, buildGanttScaleFromWindow } from "@/lib/renovation/ganttScale";
import type { PlanningRow } from "@/lib/renovation/planningSchedule";
import { LOOSE_TASK_BAR_CLASS, roomBarColorClass, roomBarTextClass } from "@/lib/renovation/roomColors";
import type { Task } from "@/lib/renovation/types";

const NAME_COL_PX = 160;
const TIMELINE_MIN_PX = 480;
const BAR_HEIGHT_PX = 20;
const BAR_LABEL_MIN_PX = 80;

type Props = {
  linkedTasks: Task[];
  looseTasks: Task[];
  roomNameById: Map<string, string>;
  planningStartDate: string | null;
  planningRows: PlanningRow[];
  totalDays: number;
  onTaskClick: (task: Task) => void;
};

function useTimelineWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(TIMELINE_MIN_PX);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(TIMELINE_MIN_PX, entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

function dayLabelForRow(t: ReturnType<typeof useI18n>["t"], row: PlanningRow): string {
  return row.dayStart === row.dayEnd
    ? t("planning.daySingle", { n: row.dayStart })
    : t("planning.dayRange", { from: row.dayStart, to: row.dayEnd });
}

function GanttRow({
  task,
  row,
  scale,
  colorClass,
  roomLabel,
  timelineWidth,
  onTaskClick,
}: {
  task: Task;
  row: PlanningRow;
  scale: ReturnType<typeof buildGanttScaleFromWindow>;
  colorClass: string;
  roomLabel: string;
  timelineWidth: number;
  onTaskClick: (task: Task) => void;
}) {
  const pos =
    row.estimatedStart && row.estimatedEnd
      ? barPositionPercentForDates(scale, row.estimatedStart, row.estimatedEnd)
      : null;
  const barWidthPx = pos ? (pos.width / 100) * timelineWidth : 0;
  const showBarLabel = pos != null && barWidthPx >= BAR_LABEL_MIN_PX;
  const barTextClass = roomBarTextClass(colorClass);

  return (
    <div
      className="flex border-b border-renovation-border/60 dark:border-renovation-border"
      style={{ minHeight: 44 }}
      data-testid="planning-gantt-row"
    >
      <div
        className="shrink-0 border-r border-renovation-border/60 px-2 py-2 dark:border-renovation-border"
        style={{ width: NAME_COL_PX }}
      >
        <div className="text-sm font-medium leading-snug text-foreground break-words" title={task.title}>
          {task.title}
        </div>
        <div className="mt-0.5 text-xs text-renovation-concrete">{roomLabel}</div>
      </div>
      <div className="relative min-w-[480px] flex-1 py-2.5">
        {pos ? (
          <button
            type="button"
            data-testid="planning-gantt-bar"
            onClick={() => onTaskClick(task)}
            className={`absolute top-1/2 flex max-w-full -translate-y-1/2 items-center overflow-hidden rounded px-1 text-left text-[10px] font-medium leading-tight opacity-90 hover:opacity-100 ${colorClass} ${barTextClass}`}
            style={{
              left: `${pos.left}%`,
              width: `${pos.width}%`,
              height: BAR_HEIGHT_PX,
              borderRadius: 4,
            }}
            title={task.title}
          >
            {showBarLabel ? <span className="truncate">{task.title}</span> : null}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function PlanningGantt({
  linkedTasks,
  looseTasks,
  roomNameById,
  planningStartDate,
  planningRows,
  totalDays,
  onTaskClick,
}: Props) {
  const { t } = useI18n();
  const { ref: timelineMeasureRef, width: timelineWidth } = useTimelineWidth();

  const rowByTaskId = useMemo(
    () => new Map(planningRows.map((row) => [row.task.id, row])),
    [planningRows]
  );

  const orderedRoomIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tk of linkedTasks) {
      for (const rid of tk.roomIds) ids.add(rid);
    }
    return [...ids].sort();
  }, [linkedTasks]);

  const allTasks = useMemo(() => [...linkedTasks, ...looseTasks], [linkedTasks, looseTasks]);

  const scale = useMemo(() => {
    if (!planningStartDate) return null;
    return buildGanttScaleFromWindow(planningStartDate, totalDays);
  }, [planningStartDate, totalDays]);

  const gridTemplate = useMemo(
    () => (scale ? scale.months.map((m) => `${m.dayCount}fr`).join(" ") : ""),
    [scale]
  );

  if (!planningStartDate) {
    return (
      <div
        data-testid="planning-gantt"
        className="overflow-hidden rounded-xl border border-renovation-border bg-renovation-elevated shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated"
      >
        <p
          data-testid="planning-gantt-no-start"
          className="border-b border-renovation-border px-4 py-3 text-sm text-renovation-concrete dark:border-renovation-border"
        >
          {t("planning.gantt.setStartHint")}
        </p>
        <ul className="divide-y divide-renovation-border/60 dark:divide-renovation-border">
          {allTasks.map((tk) => {
            const row = rowByTaskId.get(tk.id);
            const primaryRoom = tk.roomIds[0];
            const roomLabel =
              tk.roomIds.length === 0
                ? t("planning.looseTask")
                : (roomNameById.get(primaryRoom ?? "") ?? "");
            return (
              <li key={tk.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{tk.title}</div>
                  <div className="text-xs text-renovation-concrete">{roomLabel}</div>
                </div>
                {row ? (
                  <span
                    className="shrink-0 text-xs font-medium tabular-nums text-renovation-steel"
                    data-testid="planning-gantt-day-label"
                  >
                    {dayLabelForRow(t, row)}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div
      data-testid="planning-gantt"
      className="overflow-hidden rounded-xl border border-renovation-border bg-renovation-elevated shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated"
    >
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="flex border-b border-renovation-border bg-renovation-muted/50 dark:border-renovation-border dark:bg-renovation-muted/30">
            <div
              className="shrink-0 border-r border-renovation-border px-2 py-2 text-xs font-semibold text-foreground dark:border-renovation-border"
              style={{ width: NAME_COL_PX }}
            >
              {t("planning.gantt.taskColumn")}
            </div>
            <div
              ref={timelineMeasureRef}
              className="grid flex-1 text-center text-xs font-medium text-renovation-concrete"
              style={{ gridTemplateColumns: gridTemplate, minWidth: TIMELINE_MIN_PX }}
            >
              {scale?.months.map((m) => (
                <div
                  key={`${m.year}-${m.month}`}
                  className="border-l border-renovation-border/60 px-1 py-2 dark:border-renovation-border"
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {linkedTasks.map((tk) => {
            const row = rowByTaskId.get(tk.id);
            if (!row || !scale) return null;
            const primaryRoom = tk.roomIds[0];
            const label = primaryRoom ? (roomNameById.get(primaryRoom) ?? "") : "";
            const roomName = primaryRoom ? roomNameById.get(primaryRoom) : undefined;
            return (
              <GanttRow
                key={tk.id}
                task={tk}
                row={row}
                scale={scale}
                colorClass={roomBarColorClass(primaryRoom ?? null, roomName, orderedRoomIds)}
                roomLabel={label}
                timelineWidth={timelineWidth}
                onTaskClick={onTaskClick}
              />
            );
          })}

          {looseTasks.length > 0 ? (
            <>
              <div
                className="flex border-y border-dashed border-renovation-border bg-renovation-muted/40 px-2 py-1.5 text-xs font-semibold text-foreground dark:border-renovation-border dark:bg-renovation-muted/50"
                style={{ width: "100%" }}
              >
                <span style={{ width: NAME_COL_PX }} className="shrink-0">
                  {t("planning.looseSection")}
                </span>
              </div>
              {looseTasks.map((tk) => {
                const row = rowByTaskId.get(tk.id);
                if (!row || !scale) return null;
                return (
                  <GanttRow
                    key={tk.id}
                    task={tk}
                    row={row}
                    scale={scale}
                    colorClass={LOOSE_TASK_BAR_CLASS}
                    roomLabel={t("planning.looseTask")}
                    timelineWidth={timelineWidth}
                    onTaskClick={onTaskClick}
                  />
                );
              })}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
