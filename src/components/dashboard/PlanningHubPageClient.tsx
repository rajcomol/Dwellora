"use client";

import { useMemo, useState } from "react";
import PlanningGantt from "@/components/dashboard/planning/PlanningGantt";
import PlanningTaskList from "@/components/dashboard/planning/PlanningTaskList";
import TaskDetailPanel from "@/components/dashboard/planning/TaskDetailPanel";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/i18n/provider";
import { filterTasksForProjectId } from "@/lib/dashboard/projectBudget";
import { buildPlanningRows } from "@/lib/renovation/planningSchedule";
import { roomMapById, sortTasksForPlanning } from "@/lib/renovation/planningSort";
import type { Task } from "@/lib/renovation/types";

export default function PlanningHubPageClient() {
  const { t } = useI18n();
  const { selectedProjectId, selectedProject } = useSelectedProject();
  const { rooms, tasks, updateProject, isRenovationDataReady } = useRenovation();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const roomById = useMemo(() => roomMapById(rooms), [rooms]);

  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [] as Task[];
    const roomIds = new Set(rooms.filter((r) => r.projectId === selectedProjectId).map((r) => r.id));
    return sortTasksForPlanning(filterTasksForProjectId(tasks, selectedProjectId, roomIds));
  }, [selectedProjectId, rooms, tasks]);

  const planningStartDate = selectedProject?.planningStartDate ?? null;

  const { rows: planningRows, totalDays } = useMemo(
    () => buildPlanningRows(projectTasks, planningStartDate),
    [projectTasks, planningStartDate]
  );

  const { linkedTasks, looseTasks } = useMemo(() => {
    return {
      linkedTasks: projectTasks.filter((tk) => tk.roomIds.length > 0),
      looseTasks: projectTasks.filter((tk) => tk.roomIds.length === 0),
    };
  }, [projectTasks]);

  const roomLabelForTask = (task: Task): string => {
    if (task.roomIds.length === 0) return t("planning.looseTask");
    return (
      task.roomIds
        .map((rid) => roomById.get(rid)?.name)
        .filter(Boolean)
        .join(", ") || t("planning.looseTask")
    );
  };

  if (!isRenovationDataReady) {
    return <DashboardPageSkeleton />;
  }

  const allEmpty = linkedTasks.length === 0 && looseTasks.length === 0;
  const roomNameById = new Map([...roomById.entries()].map(([id, r]) => [id, r.name]));

  return (
    <div className="space-y-6">
      <div data-tour="planning-hub">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("nav.tabs.planning")}</h1>
        <p className="mt-1 text-sm leading-relaxed text-renovation-concrete">
          {selectedProject
            ? t("planning.subtitleProject", { name: selectedProject.name })
            : t("layout.topBar.chooseProject")}
        </p>
      </div>

      {!selectedProjectId ? (
        <p className="text-sm text-renovation-concrete">{t("layout.topBar.chooseProject")}</p>
      ) : allEmpty ? (
        <p className="text-sm text-renovation-concrete">{t("planning.empty")}</p>
      ) : (
        <>
          <div className="space-y-3 rounded-xl border border-renovation-border bg-renovation-elevated p-4 dark:border-renovation-border dark:bg-renovation-elevated">
            <div>
              <label htmlFor="planning-hub-start-date" className="mb-1 block text-xs font-medium text-renovation-concrete">
                {t("planning.planningStartLabel")}
              </label>
              <input
                id="planning-hub-start-date"
                data-testid="planning-start-date"
                type="date"
                value={planningStartDate ?? ""}
                onChange={(e) => {
                  if (!selectedProjectId) return;
                  updateProject({
                    id: selectedProjectId,
                    planningStartDate: e.target.value.trim() || null,
                  });
                }}
                className="rounded-lg border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
              />
            </div>
            <p className="text-sm tabular-nums text-renovation-concrete">
              {t("planning.timelineTotal")}{" "}
              <strong className="text-foreground">{totalDays}</strong> {t("planning.days")}
            </p>
          </div>

          <div className="hidden md:block">
            <PlanningGantt
              linkedTasks={linkedTasks}
              looseTasks={looseTasks}
              roomNameById={roomNameById}
              planningStartDate={planningStartDate}
              planningRows={planningRows}
              totalDays={totalDays}
              onTaskClick={setSelectedTask}
            />
          </div>
          <div className="md:hidden">
            <PlanningTaskList
              tasks={[...linkedTasks, ...looseTasks]}
              roomNameById={roomNameById}
              planningRows={planningRows}
              onTaskClick={setSelectedTask}
            />
          </div>
        </>
      )}

      <TaskDetailPanel
        task={selectedTask}
        roomLabel={selectedTask ? roomLabelForTask(selectedTask) : ""}
        projectId={selectedProjectId ?? selectedTask?.projectId ?? ""}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}
