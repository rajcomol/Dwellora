"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { PlanningPageSkeleton } from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import { buildPlanningRows } from "@/lib/renovation/planningSchedule";
import { sortTasksForPlanning } from "@/lib/renovation/planningSort";
import type { ID, Task, TaskStatus } from "@/lib/renovation/types";

function swapSortOrder(taskA: Task, taskB: Task, updateTask: (input: { id: ID; sortOrder?: number }) => void) {
  updateTask({ id: taskA.id, sortOrder: taskB.sortOrder });
  updateTask({ id: taskB.id, sortOrder: taskA.sortOrder });
}

export default function PlanningPageClient({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const { projects, rooms, tasks, teamRoster, updateTask, isRenovationDataReady } = useRenovation();

  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);
  const roomsForProject = useMemo(() => rooms.filter((r) => r.projectId === projectId), [rooms, projectId]);
  const roomIds = useMemo(() => new Set(roomsForProject.map((r) => r.id)), [roomsForProject]);
  const projectTasks = useMemo(
    () => tasks.filter((tk) => tk.roomIds.some((rid) => roomIds.has(rid))),
    [tasks, roomIds]
  );
  const roomNameById = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);
  const rosterNameById = useMemo(
    () => new Map(teamRoster.filter((r) => r.projectId === projectId).map((r) => [r.id, r.displayName])),
    [teamRoster, projectId]
  );

  const timelineTasks = useMemo(() => sortTasksForPlanning(projectTasks), [projectTasks]);
  const { rows, totalDays, remainingDays } = useMemo(() => buildPlanningRows(projectTasks), [projectTasks]);

  const showIndicativeDates = Boolean(timelineTasks[0]?.startDate);

  if (!isRenovationDataReady) {
    return <PlanningPageSkeleton />;
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("planning.notFoundTitle")}</h1>
        <p className="text-sm leading-relaxed text-renovation-concrete">{t("planning.notFoundBody")}</p>
        <Link
          href="/dashboard/projects"
          className="inline-flex rounded-lg bg-renovation-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-renovation-steel"
        >
          {t("planning.backToProjects")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-renovation-steel">
            {t("planning.eyebrow")}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{project.name}</h1>
          <p className="mt-1 text-sm leading-relaxed text-renovation-concrete">{t("planning.intro")}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <span className="rounded-lg border border-renovation-border bg-renovation-elevated px-3 py-1.5 font-medium tabular-nums dark:border-renovation-border dark:bg-renovation-elevated">
              {t("planning.timelineTotal")}{" "}
              <strong className="text-foreground">{totalDays}</strong> {t("planning.days")}
            </span>
            <span className="rounded-lg border border-renovation-border bg-renovation-elevated px-3 py-1.5 tabular-nums text-renovation-concrete dark:border-renovation-border dark:bg-renovation-elevated">
              {t("planning.openRemaining")}{" "}
              <strong className="text-foreground">{remainingDays}</strong> {t("planning.openRemainingDays")}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="inline-flex rounded-lg border border-renovation-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-renovation-muted"
          >
            {t("planning.projectOverview")}
          </Link>
          <Link
            href="/dashboard/projects"
            className="inline-flex rounded-lg bg-renovation-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-renovation-steel"
          >
            {t("planning.allProjects")}
          </Link>
        </div>
      </div>

      {showIndicativeDates ? (
        <p className="text-xs text-renovation-concrete">{t("planning.hintDatesOn")}</p>
      ) : (
        <p className="text-xs text-renovation-concrete">{t("planning.hintDatesOff")}</p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-renovation-concrete">{t("planning.noTasks")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, idx) => {
            const task = row.task;
            const dayLabel =
              row.dayStart === row.dayEnd
                ? t("planning.daySingle", { n: row.dayStart })
                : t("planning.dayRange", { from: row.dayStart, to: row.dayEnd });

            const phaseKey = `renovationPhase.${task.renovationPhase}`;
            const assignee =
              task.assignedRosterId != null
                ? (rosterNameById.get(task.assignedRosterId) ?? t("planning.assigneeUnknown"))
                : t("planning.assigneeUnassigned");

            return (
              <li
                key={task.id}
                className="rounded-xl border border-renovation-border bg-renovation-elevated p-4 shadow-sm dark:border-renovation-border dark:bg-renovation-elevated"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium text-foreground">{task.title}</span>
                      <span className="text-xs text-renovation-concrete">
                        {task.roomIds
                          .map((rid) => roomNameById.get(rid))
                          .filter(Boolean)
                          .join(", ") || t("projectDetail.roomFallback")}{" "}
                        •{" "}
                        {t(phaseKey)} • {t("projectDetail.plannedDays", { days: task.durationDays })}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-renovation-concrete">
                      <span className="tabular-nums font-medium text-renovation-steel">{dayLabel}</span>
                      {row.estimatedStart && row.estimatedEnd ? (
                        <span>
                          {t("planning.estRange", {
                            from: formatDisplayDate(row.estimatedStart),
                            to: formatDisplayDate(row.estimatedEnd),
                          })}
                        </span>
                      ) : null}
                      <span>
                        {task.startDate
                          ? t("projectDetail.startsOn", { date: formatDisplayDate(task.startDate) })
                          : t("planning.noStartDate")}{" "}
                        • {assignee}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex min-w-0 flex-col gap-1">
                      <label
                        htmlFor={`status-${task.id}`}
                        className="text-xs font-medium text-renovation-concrete"
                      >
                        {t("planning.statusShort")}
                      </label>
                      <select
                        id={`status-${task.id}`}
                        value={task.status}
                        onChange={(e) => updateTask({ id: task.id, status: e.target.value as TaskStatus })}
                        className="min-w-[7rem] rounded-lg border border-renovation-border bg-renovation-elevated px-2 py-1.5 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
                      >
                        <option value="todo">{t("task.status.todo")}</option>
                        <option value="doing">{t("task.status.doing")}</option>
                        <option value="done">{t("task.status.done")}</option>
                      </select>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        disabled={idx === 0}
                        onClick={() => swapSortOrder(task, timelineTasks[idx - 1], updateTask)}
                      >
                        {t("planning.up")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-2 py-1 text-xs"
                        disabled={idx === timelineTasks.length - 1}
                        onClick={() => swapSortOrder(task, timelineTasks[idx + 1], updateTask)}
                      >
                        {t("planning.down")}
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
