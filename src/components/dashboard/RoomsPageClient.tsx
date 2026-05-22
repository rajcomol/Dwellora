"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import ProjectDetailPageClient from "@/components/dashboard/ProjectDetailPageClient";
import RoomOverviewCard from "@/components/dashboard/RoomOverviewCard";
import RoomsSubtabNav, { type RoomsTab } from "@/components/dashboard/RoomsSubtabNav";
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

function parseTab(value: string | null | undefined): RoomsTab {
  return value === "overzicht" ? "overzicht" : "rooms";
}

type Props = {
  initialTab?: string | null;
};

export default function RoomsPageClient({ initialTab }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedProjectId, selectedProject } = useSelectedProject();
  const { rooms, tasks, createRoom, isRenovationDataReady } = useRenovation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tabFromUrl = parseTab(searchParams.get("tab") ?? initialTab ?? null);
  const [activeTab, setActiveTab] = useState<RoomsTab>(() => tabFromUrl);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const setTab = useCallback(
    (tab: RoomsTab) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "overzicht") {
        params.set("tab", "overzicht");
      } else {
        params.delete("tab");
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

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

  const summaryByRoomId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildRoomSummariesFromTasks>[number]>();
    for (const s of buildRoomSummariesFromTasks(projectRooms, projectTasks)) {
      map.set(s.room_id, s);
    }
    return map;
  }, [projectRooms, projectTasks]);

  if (!isRenovationDataReady) {
    return <DashboardPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("nav.tabs.rooms")}</h1>
          <p className="mt-1 text-sm leading-relaxed text-renovation-concrete">
            {selectedProject
              ? t("rooms.subtitleProject", { name: selectedProject.name })
              : t("layout.topBar.chooseProject")}
          </p>
        </div>
        {selectedProjectId && activeTab === "rooms" ? (
          <Button type="button" onClick={() => setShowAddForm((v) => !v)}>
            {t("rooms.newRoom")}
          </Button>
        ) : null}
      </div>

      {selectedProjectId ? <RoomsSubtabNav activeTab={activeTab} onTabChange={setTab} /> : null}

      {!selectedProjectId ? (
        <p className="text-sm text-renovation-concrete">{t("layout.topBar.chooseProject")}</p>
      ) : activeTab === "overzicht" ? (
        <ProjectDetailPageClient projectId={selectedProjectId} />
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
                    roomTasks={tasksForRoom(projectTasks, room.id)}
                    previewTasks={previewTasksForRoom(projectTasks, room.id)}
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
