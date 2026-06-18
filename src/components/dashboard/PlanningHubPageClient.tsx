"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string | null>(null);

  const roomById = useMemo(() => roomMapById(rooms), [rooms]);

  const projectRooms = useMemo(() => {
    if (!selectedProjectId) return [];
    return rooms
      .filter((r) => r.projectId === selectedProjectId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rooms, selectedProjectId]);

  useEffect(() => {
    setSelectedRoomFilter(null);
  }, [selectedProjectId]);

  const allProjectTasks = useMemo(() => {
    if (!selectedProjectId) return [] as Task[];
    const roomIds = new Set(projectRooms.map((r) => r.id));
    return sortTasksForPlanning(filterTasksForProjectId(tasks, selectedProjectId, roomIds));
  }, [selectedProjectId, projectRooms, tasks]);

  const projectTasks = useMemo(() => {
    if (!selectedRoomFilter) return allProjectTasks;
    return allProjectTasks.filter((tk) => tk.roomIds.includes(selectedRoomFilter));
  }, [allProjectTasks, selectedRoomFilter]);

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
  const roomNameById = useMemo(
    () => new Map([...roomById.entries()].map(([id, r]) => [id, r.name])),
    [roomById]
  );

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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  className="w-full rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-renovation-accent/40 dark:border-renovation-border dark:bg-renovation-surface"
                />
              </div>
              <div>
                <label htmlFor="planning-room-filter" className="mb-1 block text-xs font-medium text-renovation-concrete">
                  {t("planning.filterRoomLabel")}
                </label>
                <select
                  id="planning-room-filter"
                  data-testid="planning-room-filter"
                  value={selectedRoomFilter ?? ""}
                  onChange={(e) => setSelectedRoomFilter(e.target.value || null)}
                  className="w-full rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-renovation-accent/40 dark:border-renovation-border dark:bg-renovation-surface"
                >
                  <option value="">{t("planning.filterAllRooms")}</option>
                  {projectRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
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
