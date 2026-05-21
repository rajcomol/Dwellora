"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/provider";
import { barPositionPercent, buildGanttScale } from "@/lib/renovation/ganttScale";
import { LOOSE_TASK_BAR_CLASS, roomBarColorClass } from "@/lib/renovation/roomColors";
import { taskSpanDays } from "@/lib/renovation/taskDates";
import type { Task } from "@/lib/renovation/types";

const NAME_COL_PX = 140;

type Props = {
  linkedTasks: Task[];
  looseTasks: Task[];
  roomNameById: Map<string, string>;
  onTaskClick: (task: Task) => void;
};

function GanttRow({
  task,
  scale,
  colorClass,
  roomLabel,
  onTaskClick,
}: {
  task: Task;
  scale: ReturnType<typeof buildGanttScale>;
  colorClass: string;
  roomLabel: string;
  onTaskClick: (task: Task) => void;
}) {
  const pos = barPositionPercent(scale, task.startDate, taskSpanDays(task.durationDays));

  return (
    <div className="flex border-b border-renovation-border/60 dark:border-zinc-800" style={{ minHeight: 36 }}>
      <div
        className="shrink-0 border-r border-renovation-border/60 px-2 py-2 text-xs dark:border-zinc-800"
        style={{ width: NAME_COL_PX }}
      >
        <div className="truncate font-medium" title={task.title}>
          {task.title}
        </div>
        <div className="truncate text-[10px] text-renovation-concrete">{roomLabel}</div>
      </div>
      <div className="relative min-w-[480px] flex-1 py-1.5">
        {pos ? (
          <button
            type="button"
            onClick={() => onTaskClick(task)}
            className={`absolute top-1/2 h-5 min-w-[4px] -translate-y-1/2 rounded ${colorClass} opacity-90 hover:opacity-100`}
            style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
            title={task.title}
          />
        ) : (
          <span className="px-2 text-[10px] text-renovation-concrete">—</span>
        )}
      </div>
    </div>
  );
}

export default function PlanningGantt({ linkedTasks, looseTasks, roomNameById, onTaskClick }: Props) {
  const { t } = useI18n();

  const allWithDates = [...linkedTasks, ...looseTasks].filter((tk) => tk.startDate);
  const scale = useMemo(
    () => buildGanttScale(allWithDates.map((tk) => tk.startDate!)),
    [linkedTasks, looseTasks]
  );

  const gridTemplate = useMemo(
    () => scale.months.map((m) => `${m.dayCount}fr`).join(" "),
    [scale.months]
  );

  return (
    <div className="overflow-hidden rounded-xl border border-renovation-border dark:border-renovation-border">
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="flex border-b border-renovation-border bg-renovation-muted/50 dark:border-renovation-border dark:bg-zinc-900/50">
            <div
              className="shrink-0 border-r border-renovation-border px-2 py-2 text-xs font-semibold dark:border-zinc-800"
              style={{ width: NAME_COL_PX }}
            >
              {t("planning.gantt.taskColumn")}
            </div>
            <div
              className="grid flex-1 text-center text-xs font-medium text-renovation-concrete"
              style={{ gridTemplateColumns: gridTemplate, minWidth: 480 }}
            >
              {scale.months.map((m) => (
                <div key={`${m.year}-${m.month}`} className="border-l border-renovation-border/60 px-1 py-2 dark:border-zinc-800">
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {linkedTasks.map((tk) => {
            const primaryRoom = tk.roomIds[0];
            const label = primaryRoom ? roomNameById.get(primaryRoom) ?? "" : "";
            return (
              <GanttRow
                key={tk.id}
                task={tk}
                scale={scale}
                colorClass={roomBarColorClass(primaryRoom ?? null)}
                roomLabel={label}
                onTaskClick={onTaskClick}
              />
            );
          })}

          {looseTasks.length > 0 ? (
            <>
              <div className="flex border-y border-renovation-border bg-renovation-muted/30 px-2 py-1 text-xs font-semibold dark:border-zinc-800 dark:bg-zinc-900/30">
                <span style={{ width: NAME_COL_PX }}>{t("planning.looseSection")}</span>
              </div>
              {looseTasks.map((tk) => (
                <GanttRow
                  key={tk.id}
                  task={tk}
                  scale={scale}
                  colorClass={LOOSE_TASK_BAR_CLASS}
                  roomLabel={t("planning.looseTask")}
                  onTaskClick={onTaskClick}
                />
              ))}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
