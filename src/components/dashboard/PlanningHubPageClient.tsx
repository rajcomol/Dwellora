"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { RENOVATION_PHASE_ORDER } from "@/lib/renovation/phases";
import { roomMapById, sortTasksForPlanning } from "@/lib/renovation/planningSort";
import type { RenovationPhase, Task } from "@/lib/renovation/types";
import { useI18n } from "@/i18n/provider";

export default function PlanningHubPageClient() {
  const { t } = useI18n();
  const { projects, rooms, tasks, teamRoster } = useRenovation();

  const sortedProjects = useMemo(() => [...projects].sort((a, b) => a.name.localeCompare(b.name)), [projects]);

  const roomById = useMemo(() => roomMapById(rooms), [rooms]);
  const projectNameById = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);
  const rosterNameById = useMemo(() => new Map(teamRoster.map((r) => [r.id, r.displayName])), [teamRoster]);

  const tasksByPhase = useMemo(() => {
    const sortedAll = sortTasksForPlanning(tasks);
    const map = new Map<RenovationPhase, Task[]>();
    for (const ph of RENOVATION_PHASE_ORDER) {
      map.set(
        ph,
        sortedAll.filter((tk) => tk.renovationPhase === ph)
      );
    }
    return map;
  }, [tasks]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{t("planning.hubTitle")}</h1>
        <p className="mt-1 text-sm text-renovation-concrete">{t("planning.hubSubtitle")}</p>
      </div>

      {sortedProjects.length === 0 ? (
        <p className="text-sm text-renovation-concrete">
          {t("planning.hubEmpty")}{" "}
          <Link
            href="/dashboard/projects"
            className="font-medium text-renovation-steel underline dark:text-renovation-accent"
          >
            {t("planning.hubCreateFirst")}
          </Link>
          .
        </p>
      ) : (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-renovation-steel dark:text-renovation-accent">
            {t("planning.hubProjectsSection")}
          </h2>
          <ul className="space-y-2">
            {sortedProjects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/projects/${p.id}/planning`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-renovation-border bg-renovation-elevated px-4 py-3 text-sm shadow-sm transition-colors hover:border-renovation-steel/40 dark:border-renovation-border dark:bg-renovation-elevated dark:hover:border-renovation-accent/40"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{p.name}</span>
                  <span className="shrink-0 text-xs font-medium text-renovation-steel dark:text-renovation-accent">
                    {t("planning.hubOpen")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{t("planning.hubByPhaseTitle")}</h2>
          <p className="mt-1 text-sm text-renovation-concrete">{t("planning.hubByPhaseIntro")}</p>
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-renovation-concrete">{t("planning.hubNoTasksAnywhere")}</p>
        ) : (
          <div className="space-y-6">
            {RENOVATION_PHASE_ORDER.map((phase) => {
              const list = tasksByPhase.get(phase) ?? [];
              return (
                <div key={phase} className="rounded-xl border border-renovation-border bg-renovation-elevated p-4 dark:border-renovation-border dark:bg-renovation-elevated">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    {t(`renovationPhase.${phase}`)}
                  </h3>
                  {list.length === 0 ? (
                    <p className="mt-2 text-sm text-renovation-concrete">{t("planning.hubPhaseEmpty")}</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {list.map((task) => {
                        const room = roomById.get(task.roomId);
                        const projectId = room?.projectId;
                        const projectName = projectId ? (projectNameById.get(projectId) ?? t("planning.hubUnknownProject")) : t("planning.hubUnknownProject");
                        const roomName = room?.name ?? t("projectDetail.roomFallback");
                        const assignee =
                          task.assignedRosterId != null
                            ? (rosterNameById.get(task.assignedRosterId) ?? t("planning.assigneeUnknown"))
                            : t("planning.assigneeUnassigned");
                        const dateLabel = task.startDate
                          ? t("projectDetail.startsOn", { date: task.startDate })
                          : t("planning.noStartDate");

                        return (
                          <li
                            key={task.id}
                            className="flex flex-col gap-2 rounded-lg border border-renovation-border/80 bg-white/60 px-3 py-2 text-sm dark:border-renovation-border dark:bg-zinc-950/40 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">{task.title}</div>
                              <div className="mt-0.5 text-xs text-renovation-concrete">
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">{projectName}</span>
                                {" · "}
                                {roomName}
                                {" · "}
                                {dateLabel}
                                {" · "}
                                {assignee}
                              </div>
                            </div>
                            {projectId ? (
                              <Link
                                href={`/dashboard/projects/${projectId}/planning`}
                                className="shrink-0 text-xs font-medium text-renovation-steel underline dark:text-renovation-accent"
                              >
                                {t("planning.hubOpenProjectPlanning")}
                              </Link>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
