"use client";

import { useMemo, useState } from "react";
import RoomOverviewCard from "@/components/dashboard/RoomOverviewCard";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import Button from "@/components/ui/Button";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/i18n/provider";
import {
  buildRoomSummariesFromTasks,
  previewTasksForRoom,
  tasksForRoom,
} from "@/lib/dashboard/roomOverview";
import { roomNameFormSchema } from "@/lib/validation/schemas";

export default function RoomsPageClient() {
  const { t } = useI18n();
  const { selectedProjectId } = useSelectedProject();
  const { rooms, tasks, createRoom, projects, isRenovationDataReady } = useRenovation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const projectRooms = useMemo(
    () =>
      selectedProjectId
        ? rooms.filter((r) => r.projectId === selectedProjectId).sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [rooms, selectedProjectId]
  );

  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks.filter(
      (tk) => tk.projectId === selectedProjectId || tk.roomIds.some((rid) => projectRooms.some((r) => r.id === rid))
    );
  }, [tasks, selectedProjectId, projectRooms]);

  const planningStartDate = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId)?.planningStartDate ?? null;
  }, [projects, selectedProjectId]);

  const summaryByRoomId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildRoomSummariesFromTasks>[number]>();
    for (const s of buildRoomSummariesFromTasks(projectRooms, projectTasks, planningStartDate)) {
      map.set(s.room_id, s);
    }
    return map;
  }, [projectRooms, projectTasks, planningStartDate]);

  function openAddRoomForm() {
    setShowAddForm(true);
  }

  if (!isRenovationDataReady) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="space-y-6" data-testid="rooms-page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("nav.tabs.rooms")}</h1>
          {selectedProjectId ? (
            <p className="mt-1 text-sm leading-relaxed text-renovation-concrete">
              {t("rooms.headerMeta", {
                rooms: projectRooms.length,
                tasks: projectTasks.length,
              })}
            </p>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-renovation-concrete">{t("layout.topBar.chooseProject")}</p>
          )}
        </div>
        {selectedProjectId ? (
          <Button type="button" data-testid="rooms-new-room-button" onClick={openAddRoomForm}>
            {t("rooms.newRoom")}
          </Button>
        ) : null}
      </div>

      {!selectedProjectId ? (
        <p className="text-sm text-renovation-concrete">{t("layout.topBar.chooseProject")}</p>
      ) : (
        <>
          {showAddForm ? (
            <form
              className="flex flex-col gap-3 rounded-xl border border-renovation-border bg-renovation-elevated p-4 sm:flex-row sm:items-end dark:border-renovation-border dark:bg-renovation-elevated"
              onSubmit={(e) => {
                e.preventDefault();
                const parsed = roomNameFormSchema.safeParse({ name });
                if (!parsed.success) {
                  setError(t("validation.generic"));
                  return;
                }
                setError(null);
                createRoom({ name: parsed.data.name, projectId: selectedProjectId });
                setName("");
                setShowAddForm(false);
              }}
            >
              <div className="flex-1">
                <label htmlFor="new-room-name" className="mb-1 block text-xs font-medium text-renovation-concrete">
                  {t("rooms.addLabel")}
                </label>
                <input
                  id="new-room-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
                />
                {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
              </div>
              <Button type="submit">{t("common.save")}</Button>
            </form>
          ) : null}

          {projectRooms.length === 0 ? (
            <div
              data-testid="rooms-empty-state"
              className="flex flex-col items-center rounded-xl border border-dashed border-renovation-border bg-renovation-elevated px-6 py-12 text-center dark:border-renovation-border dark:bg-renovation-elevated"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full bg-renovation-muted text-renovation-steel"
                aria-hidden="true"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-foreground">{t("rooms.emptyStateTitle")}</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-renovation-concrete">
                {t("rooms.emptyStateBody")}
              </p>
              <Button type="button" className="mt-6" data-testid="rooms-empty-create-button" onClick={openAddRoomForm}>
                {t("rooms.emptyStateButton")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="rooms-grid">
              {projectRooms.map((room) => {
                const summary = summaryByRoomId.get(room.id) ?? {
                  room_id: room.id,
                  project_id: room.projectId,
                  room_name: room.name,
                  task_count: 0,
                  completed_count: 0,
                  estimated_cost_sum: 0,
                  earliest_start_date: null,
                  latest_end_date: null,
                };
                const roomTasks = tasksForRoom(projectTasks, room.id);
                return (
                  <RoomOverviewCard
                    key={room.id}
                    summary={summary}
                    roomName={room.name}
                    roomTasks={roomTasks}
                    previewTasks={previewTasksForRoom(projectTasks, room.id, 2)}
                    projectId={selectedProjectId}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
