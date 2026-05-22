"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/i18n/provider";
import { filterTasksForProjectId } from "@/lib/dashboard/projectBudget";
import { RENOVATION_PHASE_ORDER } from "@/lib/renovation/phases";
import { roomMapById, sortTasksForPlanning } from "@/lib/renovation/planningSort";
import type { RenovationPhase, Task } from "@/lib/renovation/types";
import { formatDisplayDate } from "@/lib/format/dateDisplay";

export default function TasksPageClient() {
  const { t } = useI18n();
  const { selectedProjectId, selectedProject } = useSelectedProject();
  const { projects, rooms, tasks, teamRoster, isRenovationDataReady } = useRenovation();

  const roomById = useMemo(() => roomMapById(rooms), [rooms]);
  const rosterNameById = useMemo(() => new Map(teamRoster.map((r) => [r.id, r.displayName])), [teamRoster]);

  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    const roomIds = new Set(rooms.filter((r) => r.projectId === selectedProjectId).map((r) => r.id));
    return sortTasksForPlanning(filterTasksForProjectId(tasks, selectedProjectId, roomIds));
  }, [selectedProjectId, rooms, tasks]);

  const tasksByPhase = useMemo(() => {
    const map = new Map<RenovationPhase, Task[]>();
    for (const ph of RENOVATION_PHASE_ORDER) {
      map.set(ph, projectTasks.filter((tk) => tk.renovationPhase === ph));
    }
    return map;
  }, [projectTasks]);

  if (!isRenovationDataReady) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div data-tour="planning-hub">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("nav.tabs.tasks")}</h1>
        <p className="mt-1 text-sm leading-relaxed text-renovation-concrete">
          {selectedProject
            ? t("tasks.subtitleProject", { name: selectedProject.name })
            : t("layout.topBar.chooseProject")}
        </p>
      </div>

      {!selectedProjectId ? (
        <p className="text-sm text-renovation-concrete">
          <Link href="/dashboard/projects" className="font-medium underline">
            {t("planning.hubCreateFirst")}
          </Link>
        </p>
      ) : projectTasks.length === 0 ? (
        <p className="text-sm text-renovation-concrete">{t("tasks.empty")}</p>
      ) : (
        RENOVATION_PHASE_ORDER.map((phase) => {
          const list = tasksByPhase.get(phase) ?? [];
          if (list.length === 0) return null;
          return (
            <section key={phase}>
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-renovation-steel">
                {t(`renovationPhase.${phase}`)}
              </h2>
              <ul className="mt-2 space-y-2">
                {list.map((tk) => {
                  const roomNames = tk.roomIds
                    .map((rid) => roomById.get(rid)?.name)
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <li
                      key={tk.id}
                      className="rounded-lg border border-renovation-border bg-renovation-elevated px-4 py-3 dark:border-renovation-border dark:bg-renovation-elevated"
                    >
                      <div className="font-medium">{tk.title}</div>
                      <div className="mt-1 text-xs text-renovation-concrete">
                        {roomNames || "—"} • {t(`task.status.${tk.status}`)}
                        {tk.startDate ? ` • ${formatDisplayDate(tk.startDate)}` : ""}
                        {tk.assignedRosterId
                          ? ` • ${rosterNameById.get(tk.assignedRosterId) ?? ""}`
                          : ""}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}

      {selectedProjectId ? (
        <p className="text-sm">
          <Link
            href={`/dashboard/projects/${selectedProjectId}/overview`}
            className="font-medium text-renovation-steel underline dark:text-renovation-accent"
          >
            {t("tasks.editInProject")}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
