"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RoomOverviewCard, { previewTasksForRoom } from "@/components/dashboard/RoomOverviewCard";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { appendProjectQuery } from "@/components/layout/tab-nav-config";
import Button from "@/components/ui/Button";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/i18n/provider";
import type { RoomTaskSummaryRow } from "@/lib/dashboard/roomOverview";
import { supabase } from "@/lib/supabase/client";
import { roomNameFormSchema } from "@/lib/validation/schemas";

export default function RoomsPageClient() {
  const { t } = useI18n();
  const { selectedProjectId, selectedProject } = useSelectedProject();
  const { rooms, tasks, createRoom, isRenovationDataReady } = useRenovation();
  const [summaries, setSummaries] = useState<RoomTaskSummaryRow[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);
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

  const summaryByRoomId = useMemo(() => {
    const map = new Map<string, RoomTaskSummaryRow>();
    for (const s of summaries) {
      map.set(s.room_id, s);
    }
    return map;
  }, [summaries]);

  useEffect(() => {
    if (!selectedProjectId) {
      setSummaries([]);
      return;
    }
    let cancelled = false;
    setSummariesLoading(true);
    void (async () => {
      const res = await supabase
        .from("room_task_summary")
        .select(
          "room_id,project_id,room_name,task_count,completed_count,estimated_cost_sum,earliest_start_date,latest_end_date"
        )
        .eq("project_id", selectedProjectId);
      if (!cancelled) {
        setSummariesLoading(false);
        if (!res.error && res.data) {
          setSummaries(res.data as RoomTaskSummaryRow[]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, rooms.length, tasks.length]);

  if (!isRenovationDataReady) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("nav.tabs.rooms")}</h1>
          <p className="mt-1 text-sm text-renovation-concrete">
            {selectedProject
              ? t("rooms.subtitleProject", { name: selectedProject.name })
              : t("layout.topBar.chooseProject")}
          </p>
        </div>
        {selectedProjectId ? (
          <Button type="button" onClick={() => setShowAddForm((v) => !v)}>
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
                  className="w-full rounded-lg border border-renovation-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
                {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
              </div>
              <Button type="submit">{t("common.save")}</Button>
            </form>
          ) : null}

          {summariesLoading && projectRooms.length > 0 ? (
            <p className="text-sm text-renovation-concrete">{t("common.loading")}</p>
          ) : null}

          {projectRooms.length === 0 ? (
            <p className="text-sm text-renovation-concrete">{t("rooms.empty")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                return (
                  <RoomOverviewCard
                    key={room.id}
                    summary={summary}
                    roomName={room.name}
                    previewTasks={previewTasksForRoom(tasks, room.id)}
                    projectId={selectedProjectId}
                  />
                );
              })}
            </div>
          )}

          {selectedProjectId ? (
            <p className="text-center text-xs">
              <Link
                href={appendProjectQuery(`/dashboard/projects/${selectedProjectId}/overview`, selectedProjectId)}
                className="text-renovation-steel underline decoration-renovation-accent/40 underline-offset-2 dark:text-renovation-accent"
              >
                {t("rooms.fullProjectView")}
              </Link>
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
