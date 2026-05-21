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
import { roomMapById } from "@/lib/renovation/planningSort";
import { compareTasksByStartDate } from "@/lib/renovation/taskDates";
import type { Task } from "@/lib/renovation/types";

export default function PlanningHubPageClient() {
  const { t } = useI18n();
  const { selectedProjectId, selectedProject } = useSelectedProject();
  const { rooms, tasks, isRenovationDataReady } = useRenovation();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const roomById = useMemo(() => roomMapById(rooms), [rooms]);

  const { linkedTasks, looseTasks } = useMemo(() => {
    if (!selectedProjectId) return { linkedTasks: [] as Task[], looseTasks: [] as Task[] };
    const roomIds = new Set(rooms.filter((r) => r.projectId === selectedProjectId).map((r) => r.id));
    const projectTasks = filterTasksForProjectId(tasks, selectedProjectId, roomIds).sort(compareTasksByStartDate);
    return {
      linkedTasks: projectTasks.filter((tk) => tk.roomIds.length > 0),
      looseTasks: projectTasks.filter((tk) => tk.roomIds.length === 0),
    };
  }, [selectedProjectId, rooms, tasks]);

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

  return (
    <div className="space-y-6">
      <div data-tour="planning-hub">
        <h1 className="text-2xl font-semibold">{t("nav.tabs.planning")}</h1>
        <p className="mt-1 text-sm text-renovation-concrete">
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
          <div className="hidden md:block">
            <PlanningGantt
              linkedTasks={linkedTasks}
              looseTasks={looseTasks}
              roomNameById={new Map([...roomById.entries()].map(([id, r]) => [id, r.name]))}
              onTaskClick={setSelectedTask}
            />
          </div>
          <div className="md:hidden">
            <PlanningTaskList
              tasks={[...linkedTasks, ...looseTasks]}
              roomNameById={new Map([...roomById.entries()].map(([id, r]) => [id, r.name]))}
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
