"use client";

import { DEFAULT_RENOVATION_PHASE, parseRenovationPhase } from "@/lib/renovation/phases";
import type {
  ID,
  KeyHandoverChecklistItem,
  Project,
  ProjectExpense,
  RenovationState,
  RenovationPhase,
  Room,
  Task,
  TaskAttachment,
  TaskDependency,
  TaskPriority,
  TaskStatus,
  TeamRosterEntry,
} from "@/lib/renovation/types";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const DOCUMENTS_BUCKET = "documents";

/** Ensures roster row belongs to the same project as the task's room. */
async function resolveAssignedRosterIdForTaskRoom(roomId: ID, rosterId: ID | null | undefined): Promise<ID | null> {
  if (rosterId == null || rosterId === "") return null;
  const roomRes = await supabase.from("rooms").select("project_id").eq("id", roomId).maybeSingle();
  if (roomRes.error || !roomRes.data) return null;
  const projectId = String(roomRes.data.project_id);
  const rs = await supabase.from("project_team_roster").select("project_id").eq("id", rosterId).maybeSingle();
  if (rs.error || !rs.data) return null;
  if (String(rs.data.project_id) !== projectId) return null;
  return rosterId;
}

type CreateProjectInput = {
  name: string;
  totalBudget: number;
  address?: string;
  expectedKeyHandover?: string | null;
  notes?: string;
};

type UpdateProjectInput = {
  id: ID;
  name?: string;
  totalBudget?: number;
  address?: string;
  expectedKeyHandover?: string | null;
  notes?: string;
};

type CreateTaskInput = {
  title: string;
  roomId: ID;
  status: TaskStatus;
  estimatedCost: number;
  actualCost?: number;
  durationDays: number;
  priority: TaskPriority;
  description?: string;
  sortOrder?: number;
  startDate?: string | null;
  assignedRosterId?: ID | null;
  renovationPhase?: RenovationPhase;
};

type UpdateTaskInput = {
  id: ID;
  title?: string;
  status?: TaskStatus;
  estimatedCost?: number;
  actualCost?: number;
  durationDays?: number;
  priority?: TaskPriority;
  description?: string;
  sortOrder?: number;
  startDate?: string | null;
  roomId?: ID;
  assignedRosterId?: ID | null;
  renovationPhase?: RenovationPhase;
};

type RenovationActions = {
  createProject: (input: CreateProjectInput) => void;
  updateProject: (input: UpdateProjectInput) => void;
  createRoom: (input: { name: string; projectId: ID }) => void;
  deleteRoom: (id: ID) => void;
  createTask: (input: CreateTaskInput) => void;
  updateTask: (input: UpdateTaskInput) => Promise<boolean>;
  deleteTask: (id: ID) => void;
  addTaskDependency: (taskId: ID, dependsOnTaskId: ID) => void;
  removeTaskDependency: (id: ID) => void;
  uploadTaskAttachment: (taskId: ID, file: File) => Promise<{ ok: true } | { ok: false; error: string }>;
  removeTaskAttachment: (id: ID) => void;
  addChecklistItem: (projectId: ID, title: string) => void;
  updateChecklistItem: (input: { id: ID; title?: string; isDone?: boolean; sortOrder?: number }) => void;
  deleteChecklistItem: (id: ID) => void;
  addTeamRosterEntry: (projectId: ID, input: { displayName: string; email?: string; roleHint?: string }) => void;
  updateTeamRosterEntry: (input: {
    id: ID;
    displayName?: string;
    email?: string;
    roleHint?: string;
    sortOrder?: number;
  }) => void;
  deleteTeamRosterEntry: (id: ID) => void;
  createProjectExpense: (input: {
    projectId: ID;
    title: string;
    amount: number;
    spentOn?: string | null;
    notes?: string;
  }) => void;
  updateProjectExpense: (input: {
    id: ID;
    title?: string;
    amount?: number;
    spentOn?: string | null;
    notes?: string;
  }) => void;
  deleteProjectExpense: (id: ID) => void;
};

type RenovationContextValue = RenovationState & RenovationActions;

const RenovationContext = createContext<RenovationContextValue | undefined>(undefined);

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "todo" || value === "doing" || value === "done";
}

function mapProject(row: {
  id: unknown;
  name: unknown;
  total_budget: unknown;
  address?: unknown;
  expected_key_handover?: unknown;
  notes?: unknown;
}): Project {
  const ek = row.expected_key_handover;
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    totalBudget:
      typeof row.total_budget === "number"
        ? row.total_budget
        : Number.parseFloat(String(row.total_budget ?? "0")) || 0,
    address: String(row.address ?? ""),
    expectedKeyHandover: ek == null || ek === "" ? null : String(ek),
    notes: String(row.notes ?? ""),
  };
}

function mapRoom(row: { id: unknown; name: unknown; project_id: unknown }): Room {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    projectId: String(row.project_id),
  };
}

function mapTask(row: {
  id: unknown;
  title: unknown;
  room_id: unknown;
  status: unknown;
  estimated_cost: unknown;
  actual_cost?: unknown;
  duration_days: unknown;
  priority: unknown;
  description?: unknown;
  sort_order?: unknown;
  start_date?: unknown;
  assigned_roster_id?: unknown;
  renovation_phase?: unknown;
}): Task {
  const rawPriority = row.priority;
  const priority: TaskPriority =
    rawPriority === "low" || rawPriority === "medium" || rawPriority === "high" ? rawPriority : "medium";

  const sd = row.start_date;
  const ar = row.assigned_roster_id;
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    roomId: String(row.room_id),
    renovationPhase: parseRenovationPhase(row.renovation_phase),
    status: isTaskStatus(row.status) ? row.status : "todo",
    estimatedCost:
      typeof row.estimated_cost === "number"
        ? row.estimated_cost
        : Number.parseFloat(String(row.estimated_cost ?? "0")) || 0,
    actualCost:
      typeof row.actual_cost === "number"
        ? row.actual_cost
        : Number.parseFloat(String(row.actual_cost ?? "0")) || 0,
    durationDays:
      typeof row.duration_days === "number"
        ? row.duration_days
        : Number.parseFloat(String(row.duration_days ?? "0")) || 0,
    priority,
    description: String(row.description ?? ""),
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : Number(row.sort_order ?? 0) || 0,
    startDate: sd == null || sd === "" ? null : String(sd),
    assignedRosterId: ar == null || ar === "" ? null : String(ar),
  };
}

function mapExpense(row: {
  id: unknown;
  project_id: unknown;
  title: unknown;
  amount: unknown;
  spent_on?: unknown;
  notes?: unknown;
  created_at?: unknown;
}): ProjectExpense {
  const so = row.spent_on;
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    title: String(row.title ?? ""),
    amount:
      typeof row.amount === "number" ? row.amount : Number.parseFloat(String(row.amount ?? "0")) || 0,
    spentOn: so == null || so === "" ? null : String(so),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapDep(row: { id: unknown; task_id: unknown; depends_on_task_id: unknown }): TaskDependency {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    dependsOnTaskId: String(row.depends_on_task_id),
  };
}

function mapAtt(row: {
  id: unknown;
  task_id: unknown;
  file_name: unknown;
  file_path: unknown;
  created_at: unknown;
}): TaskAttachment {
  return {
    id: String(row.id),
    taskId: String(row.task_id),
    fileName: String(row.file_name ?? ""),
    filePath: String(row.file_path ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapCheck(row: {
  id: unknown;
  project_id: unknown;
  title: unknown;
  is_done: unknown;
  sort_order: unknown;
}): KeyHandoverChecklistItem {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    title: String(row.title ?? ""),
    isDone: Boolean(row.is_done),
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : Number(row.sort_order ?? 0) || 0,
  };
}

function mapRoster(row: {
  id: unknown;
  project_id: unknown;
  display_name: unknown;
  email: unknown;
  role_hint: unknown;
  sort_order: unknown;
}): TeamRosterEntry {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    displayName: String(row.display_name ?? ""),
    email: String(row.email ?? ""),
    roleHint: String(row.role_hint ?? ""),
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : Number(row.sort_order ?? 0) || 0,
  };
}

export function RenovationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RenovationState>({
    projects: [],
    rooms: [],
    tasks: [],
    projectExpenses: [],
    taskDependencies: [],
    taskAttachments: [],
    checklistItems: [],
    teamRoster: [],
  });
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSessionUserId(data.session?.user.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUserId(session?.user.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      if (!sessionUserId) {
        setState({
          projects: [],
          rooms: [],
          tasks: [],
          projectExpenses: [],
          taskDependencies: [],
          taskAttachments: [],
          checklistItems: [],
          teamRoster: [],
        });
        return;
      }

      const projectsRes = await supabase
        .from("projects")
        .select("id,name,total_budget,address,expected_key_handover,notes,created_at")
        .eq("user_id", sessionUserId);

      if (projectsRes.error || !(projectsRes.data?.length)) {
        if (cancelled) return;
        if (projectsRes.error) {
          console.error("Failed to load renovation data", {
            projectsError: projectsRes.error.message,
          });
        }
        setState({
          projects: [],
          rooms: [],
          tasks: [],
          projectExpenses: [],
          taskDependencies: [],
          taskAttachments: [],
          checklistItems: [],
          teamRoster: [],
        });
        return;
      }

      const projectIds = projectsRes.data.map((p) => String(p.id));

      const roomsRes = await supabase.from("rooms").select("id,name,project_id").in("project_id", projectIds);

      if (roomsRes.error) {
        if (cancelled) return;
        console.error("Failed to load renovation data", { roomsError: roomsRes.error.message });
        return;
      }

      const roomIds = (roomsRes.data ?? []).map((r) => String(r.id));

      const tasksRes =
        roomIds.length > 0
          ? await supabase
              .from("tasks")
              .select(
                "id,title,room_id,renovation_phase,status,estimated_cost,actual_cost,duration_days,priority,description,sort_order,start_date,assigned_roster_id"
              )
              .in("room_id", roomIds)
          : { data: [] as Record<string, unknown>[], error: null };

      const taskIds = (tasksRes.data ?? []).map((t) => String(t.id));

      const ext = await Promise.all([
        supabase.from("project_expenses").select("id,project_id,title,amount,spent_on,notes,created_at").in("project_id", projectIds),
        taskIds.length > 0
          ? supabase.from("task_dependencies").select("id,task_id,depends_on_task_id").in("task_id", taskIds)
          : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
        taskIds.length > 0
          ? supabase.from("task_attachments").select("id,task_id,file_name,file_path,created_at").in("task_id", taskIds)
          : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
        supabase
          .from("key_handover_checklist_items")
          .select("id,project_id,title,is_done,sort_order")
          .in("project_id", projectIds),
        supabase
          .from("project_team_roster")
          .select("id,project_id,display_name,email,role_hint,sort_order")
          .in("project_id", projectIds),
      ]);

      if (cancelled) return;

      if (tasksRes.error) {
        console.error("Failed to load renovation data", { tasksError: tasksRes.error.message });
        return;
      }

      const [expensesRes, depsRes, attRes, checklistRes, rosterRes] = ext;
      const logExt = (label: string, err: { message: string } | null) => {
        if (err) console.warn(`Renovation extension load (${label}):`, err.message);
      };
      logExt("project_expenses", expensesRes.error);
      logExt("task_dependencies", depsRes.error);
      logExt("task_attachments", attRes.error);
      logExt("checklist", checklistRes.error);
      logExt("team_roster", rosterRes.error);

      setState({
        projects: (projectsRes.data ?? []).map((r) =>
          mapProject(r as Parameters<typeof mapProject>[0])
        ),
        rooms: (roomsRes.data ?? []).map((r) =>
          mapRoom(r as { id: unknown; name: unknown; project_id: unknown })
        ),
        tasks: (tasksRes.data ?? []).map((r) => mapTask(r as Parameters<typeof mapTask>[0])),
        projectExpenses: expensesRes.error
          ? []
          : (expensesRes.data ?? []).map((r) => mapExpense(r as Parameters<typeof mapExpense>[0])),
        taskDependencies: depsRes.error
          ? []
          : (depsRes.data ?? []).map((r) =>
              mapDep(r as { id: unknown; task_id: unknown; depends_on_task_id: unknown })
            ),
        taskAttachments: attRes.error
          ? []
          : (attRes.data ?? []).map((r) => mapAtt(r as Parameters<typeof mapAtt>[0])),
        checklistItems: checklistRes.error
          ? []
          : (checklistRes.data ?? []).map((r) => mapCheck(r as Parameters<typeof mapCheck>[0])),
        teamRoster: rosterRes.error
          ? []
          : (rosterRes.data ?? []).map((r) => mapRoster(r as Parameters<typeof mapRoster>[0])),
      });
    }

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [sessionUserId]);

  const createProject = (input: CreateProjectInput) => {
    const trimmed = input.name.trim();
    if (!trimmed) return;
    if (!Number.isFinite(input.totalBudget)) return;

    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) return;

      const row = {
        name: trimmed,
        total_budget: input.totalBudget,
        user_id: uid,
        address: (input.address ?? "").trim(),
        expected_key_handover: input.expectedKeyHandover?.trim() || null,
        notes: (input.notes ?? "").trim(),
      };

      const res = await supabase
        .from("projects")
        .insert(row)
        .select("id,name,total_budget,address,expected_key_handover,notes,created_at")
        .single();

      if (res.error || !res.data) return;
      setState((prev) => ({ ...prev, projects: [...prev.projects, mapProject(res.data)] }));
    })();
  };

  const updateProject = (input: UpdateProjectInput) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.totalBudget !== undefined) patch.total_budget = input.totalBudget;
      if (input.address !== undefined) patch.address = input.address.trim();
      if (input.expectedKeyHandover !== undefined) {
        patch.expected_key_handover = input.expectedKeyHandover?.trim() || null;
      }
      if (input.notes !== undefined) patch.notes = input.notes.trim();
      if (Object.keys(patch).length === 0) return;

      const res = await supabase
        .from("projects")
        .update(patch)
        .eq("id", input.id)
        .select("id,name,total_budget,address,expected_key_handover,notes,created_at")
        .single();

      if (res.error || !res.data) return;
      const next = mapProject(res.data);
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => (p.id === next.id ? next : p)),
      }));
    })();
  };

  const createRoom = (input: { name: string; projectId: ID }) => {
    const trimmed = input.name.trim();
    if (!trimmed) return;

    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const res = await supabase
        .from("rooms")
        .insert({ name: trimmed, project_id: input.projectId })
        .select("id,name,project_id")
        .single();

      if (res.error || !res.data) return;
      setState((prev) => ({ ...prev, rooms: [...prev.rooms, mapRoom(res.data)] }));
    })();
  };

  const deleteRoom = (roomId: ID) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const tasksRes = await supabase.from("tasks").select("id").eq("room_id", roomId);
      if (tasksRes.error) return;
      const taskIds = (tasksRes.data ?? []).map((r: { id: unknown }) => String(r.id));
      if (taskIds.length > 0) {
        const attsRes = await supabase.from("task_attachments").select("file_path").in("task_id", taskIds);
        if (!attsRes.error) {
          const paths = (attsRes.data ?? [])
            .map((r: { file_path?: unknown }) => (typeof r.file_path === "string" ? r.file_path : ""))
            .filter(Boolean);
          if (paths.length > 0) {
            await supabase.storage.from(DOCUMENTS_BUCKET).remove(paths);
          }
        }
      }

      const res = await supabase.from("rooms").delete().eq("id", roomId);
      if (res.error) return;

      setState((prev) => {
        const taskIdSet = new Set(prev.tasks.filter((t) => t.roomId === roomId).map((t) => t.id));
        return {
          ...prev,
          rooms: prev.rooms.filter((r) => r.id !== roomId),
          tasks: prev.tasks.filter((t) => t.roomId !== roomId),
          taskDependencies: prev.taskDependencies.filter(
            (d) => !taskIdSet.has(d.taskId) && !taskIdSet.has(d.dependsOnTaskId)
          ),
          taskAttachments: prev.taskAttachments.filter((a) => !taskIdSet.has(a.taskId)),
        };
      });
    })();
  };

  const createTask = (input: CreateTaskInput) => {
    const trimmed = input.title.trim();
    if (!trimmed) return;
    if (!Number.isFinite(input.estimatedCost)) return;
    if (!Number.isFinite(input.durationDays)) return;

    const actualCost = input.actualCost ?? 0;
    if (!Number.isFinite(actualCost)) return;

    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      let sortOrder = input.sortOrder;
      if (sortOrder === undefined) {
        const ordRes = await supabase.from("tasks").select("sort_order").eq("room_id", input.roomId);
        const nums = (ordRes.data ?? []).map((r: { sort_order?: unknown }) =>
          typeof r.sort_order === "number" ? r.sort_order : Number(r.sort_order ?? 0) || 0
        );
        sortOrder = Math.max(-1, ...nums) + 1;
      }

      const assignedRosterId = await resolveAssignedRosterIdForTaskRoom(input.roomId, input.assignedRosterId);

      const insertRow = {
        title: trimmed,
        room_id: input.roomId,
        renovation_phase: input.renovationPhase ?? DEFAULT_RENOVATION_PHASE,
        status: input.status,
        estimated_cost: input.estimatedCost,
        actual_cost: actualCost,
        duration_days: input.durationDays,
        priority: input.priority,
        description: (input.description ?? "").trim(),
        sort_order: sortOrder,
        start_date: input.startDate?.trim() || null,
        assigned_roster_id: assignedRosterId,
      };

      const res = await supabase
        .from("tasks")
        .insert(insertRow)
        .select(
          "id,title,room_id,renovation_phase,status,estimated_cost,actual_cost,duration_days,priority,description,sort_order,start_date,assigned_roster_id"
        )
        .single();

      if (res.error || !res.data) return;
      setState((prev) => ({ ...prev, tasks: [...prev.tasks, mapTask(res.data)] }));
    })();
  };

  const updateTask = async (input: UpdateTaskInput): Promise<boolean> => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return false;

    const taskRes = await supabase.from("tasks").select("room_id").eq("id", input.id).maybeSingle();
    if (taskRes.error || !taskRes.data) return false;
    const effectiveRoomId =
      input.roomId !== undefined ? input.roomId : String(taskRes.data.room_id);

    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.status !== undefined) patch.status = input.status;
    if (input.estimatedCost !== undefined) patch.estimated_cost = input.estimatedCost;
    if (input.actualCost !== undefined) patch.actual_cost = input.actualCost;
    if (input.durationDays !== undefined) patch.duration_days = input.durationDays;
    if (input.priority !== undefined) patch.priority = input.priority;
    if (input.description !== undefined) patch.description = input.description.trim();
    if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
    if (input.startDate !== undefined) patch.start_date = input.startDate?.trim() || null;
    if (input.roomId !== undefined) patch.room_id = input.roomId;
    if (input.renovationPhase !== undefined) patch.renovation_phase = input.renovationPhase;
    if (input.assignedRosterId !== undefined) {
      patch.assigned_roster_id = await resolveAssignedRosterIdForTaskRoom(
        effectiveRoomId,
        input.assignedRosterId
      );
    }
    if (Object.keys(patch).length === 0) return true;

    const res = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", input.id)
      .select(
        "id,title,room_id,renovation_phase,status,estimated_cost,actual_cost,duration_days,priority,description,sort_order,start_date,assigned_roster_id"
      )
      .single();

    if (res.error || !res.data) return false;
    const next = mapTask(res.data);
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((tk) => (tk.id === next.id ? next : tk)),
    }));
    return true;
  };

  const deleteTask = (id: ID) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const res = await supabase.from("tasks").delete().eq("id", id);
      if (res.error) return;
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== id),
        taskDependencies: prev.taskDependencies.filter((d) => d.taskId !== id && d.dependsOnTaskId !== id),
        taskAttachments: prev.taskAttachments.filter((a) => a.taskId !== id),
      }));
    })();
  };

  const addTaskDependency = (taskId: ID, dependsOnTaskId: ID) => {
    if (taskId === dependsOnTaskId) return;
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const res = await supabase
        .from("task_dependencies")
        .insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId })
        .select("id,task_id,depends_on_task_id")
        .single();

      if (res.error || !res.data) return;
      setState((prev) => ({
        ...prev,
        taskDependencies: [...prev.taskDependencies, mapDep(res.data)],
      }));
    })();
  };

  const removeTaskDependency = (id: ID) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const res = await supabase.from("task_dependencies").delete().eq("id", id);
      if (res.error) return;
      setState((prev) => ({
        ...prev,
        taskDependencies: prev.taskDependencies.filter((d) => d.id !== id),
      }));
    })();
  };

  const uploadTaskAttachment = async (
    taskId: ID,
    file: File
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return { ok: false, error: "Niet ingelogd." };

    const taskRes = await supabase
      .from("tasks")
      .select("id,room_id")
      .eq("id", taskId)
      .maybeSingle();
    if (taskRes.error || !taskRes.data) return { ok: false, error: "Taak niet gevonden." };

    const roomRes = await supabase
      .from("rooms")
      .select("id,project_id")
      .eq("id", String(taskRes.data.room_id))
      .maybeSingle();
    if (roomRes.error || !roomRes.data) return { ok: false, error: "Ruimte niet gevonden." };

    const room = { projectId: String(roomRes.data.project_id) };

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const path = `${room.projectId}/tasks/${taskId}/${safeName}`;

    const up = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, { upsert: true });
    if (up.error) return { ok: false, error: up.error.message };

    const ins = await supabase
      .from("task_attachments")
      .insert({ task_id: taskId, file_name: file.name, file_path: path })
      .select("id,task_id,file_name,file_path,created_at")
      .single();

    if (ins.error || !ins.data) {
      return { ok: false, error: ins.error?.message ?? "Kon bijlageregel niet opslaan." };
    }

    setState((prev) => ({
      ...prev,
      taskAttachments: [...prev.taskAttachments, mapAtt(ins.data)],
    }));
    return { ok: true };
  };

  const removeTaskAttachment = (id: ID) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const row = await supabase.from("task_attachments").select("file_path").eq("id", id).maybeSingle();
      const fp = row.data?.file_path;
      if (typeof fp === "string" && fp) {
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([fp]);
      }

      const res = await supabase.from("task_attachments").delete().eq("id", id);
      if (res.error) return;
      setState((prev) => ({
        ...prev,
        taskAttachments: prev.taskAttachments.filter((a) => a.id !== id),
      }));
    })();
  };

  const addChecklistItem = (projectId: ID, title: string) => {
    const t = title.trim();
    if (!t) return;
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const ordRes = await supabase.from("key_handover_checklist_items").select("sort_order").eq("project_id", projectId);
      const nums = (ordRes.data ?? []).map((r: { sort_order?: unknown }) =>
        typeof r.sort_order === "number" ? r.sort_order : Number(r.sort_order ?? 0) || 0
      );
      const maxSort = Math.max(-1, ...nums) + 1;

      const res = await supabase
        .from("key_handover_checklist_items")
        .insert({ project_id: projectId, title: t, is_done: false, sort_order: maxSort })
        .select("id,project_id,title,is_done,sort_order")
        .single();

      if (res.error || !res.data) return;
      setState((prev) => ({
        ...prev,
        checklistItems: [...prev.checklistItems, mapCheck(res.data)],
      }));
    })();
  };

  const updateChecklistItem = (input: {
    id: ID;
    title?: string;
    isDone?: boolean;
    sortOrder?: number;
  }) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const patch: Record<string, unknown> = {};
      if (input.title !== undefined) patch.title = input.title.trim();
      if (input.isDone !== undefined) patch.is_done = input.isDone;
      if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
      if (Object.keys(patch).length === 0) return;

      const res = await supabase
        .from("key_handover_checklist_items")
        .update(patch)
        .eq("id", input.id)
        .select("id,project_id,title,is_done,sort_order")
        .single();

      if (res.error || !res.data) return;
      const next = mapCheck(res.data);
      setState((prev) => ({
        ...prev,
        checklistItems: prev.checklistItems.map((c) => (c.id === next.id ? next : c)),
      }));
    })();
  };

  const deleteChecklistItem = (id: ID) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const res = await supabase.from("key_handover_checklist_items").delete().eq("id", id);
      if (res.error) return;
      setState((prev) => ({
        ...prev,
        checklistItems: prev.checklistItems.filter((c) => c.id !== id),
      }));
    })();
  };

  const addTeamRosterEntry = (
    projectId: ID,
    input: { displayName: string; email?: string; roleHint?: string }
  ) => {
    const dn = input.displayName.trim();
    if (!dn) return;
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const ordRes = await supabase.from("project_team_roster").select("sort_order").eq("project_id", projectId);
      const nums = (ordRes.data ?? []).map((r: { sort_order?: unknown }) =>
        typeof r.sort_order === "number" ? r.sort_order : Number(r.sort_order ?? 0) || 0
      );
      const maxSort = Math.max(-1, ...nums) + 1;

      const res = await supabase
        .from("project_team_roster")
        .insert({
          project_id: projectId,
          display_name: dn,
          email: (input.email ?? "").trim(),
          role_hint: (input.roleHint ?? "").trim(),
          sort_order: maxSort,
        })
        .select("id,project_id,display_name,email,role_hint,sort_order")
        .single();

      if (res.error || !res.data) return;
      setState((prev) => ({
        ...prev,
        teamRoster: [...prev.teamRoster, mapRoster(res.data)],
      }));
    })();
  };

  const updateTeamRosterEntry = (input: {
    id: ID;
    displayName?: string;
    email?: string;
    roleHint?: string;
    sortOrder?: number;
  }) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const patch: Record<string, unknown> = {};
      if (input.displayName !== undefined) patch.display_name = input.displayName.trim();
      if (input.email !== undefined) patch.email = input.email.trim();
      if (input.roleHint !== undefined) patch.role_hint = input.roleHint.trim();
      if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
      if (Object.keys(patch).length === 0) return;

      const res = await supabase
        .from("project_team_roster")
        .update(patch)
        .eq("id", input.id)
        .select("id,project_id,display_name,email,role_hint,sort_order")
        .single();

      if (res.error || !res.data) return;
      const next = mapRoster(res.data);
      setState((prev) => ({
        ...prev,
        teamRoster: prev.teamRoster.map((r) => (r.id === next.id ? next : r)),
      }));
    })();
  };

  const deleteTeamRosterEntry = (id: ID) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const res = await supabase.from("project_team_roster").delete().eq("id", id);
      if (res.error) return;
      setState((prev) => ({
        ...prev,
        teamRoster: prev.teamRoster.filter((r) => r.id !== id),
        tasks: prev.tasks.map((t) => (t.assignedRosterId === id ? { ...t, assignedRosterId: null } : t)),
      }));
    })();
  };

  const createProjectExpense = (input: {
    projectId: ID;
    title: string;
    amount: number;
    spentOn?: string | null;
    notes?: string;
  }) => {
    const title = input.title.trim();
    if (!title) return;
    if (!Number.isFinite(input.amount) || input.amount < 0) return;

    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const res = await supabase
        .from("project_expenses")
        .insert({
          project_id: input.projectId,
          title,
          amount: input.amount,
          spent_on: input.spentOn?.trim() || null,
          notes: (input.notes ?? "").trim(),
        })
        .select("id,project_id,title,amount,spent_on,notes,created_at")
        .single();

      if (res.error || !res.data) return;
      setState((prev) => ({
        ...prev,
        projectExpenses: [...prev.projectExpenses, mapExpense(res.data)],
      }));
    })();
  };

  const updateProjectExpense = (input: {
    id: ID;
    title?: string;
    amount?: number;
    spentOn?: string | null;
    notes?: string;
  }) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const patch: Record<string, unknown> = {};
      if (input.title !== undefined) patch.title = input.title.trim();
      if (input.amount !== undefined) patch.amount = input.amount;
      if (input.spentOn !== undefined) patch.spent_on = input.spentOn?.trim() || null;
      if (input.notes !== undefined) patch.notes = input.notes.trim();
      if (Object.keys(patch).length === 0) return;

      const res = await supabase
        .from("project_expenses")
        .update(patch)
        .eq("id", input.id)
        .select("id,project_id,title,amount,spent_on,notes,created_at")
        .single();

      if (res.error || !res.data) return;
      const next = mapExpense(res.data);
      setState((prev) => ({
        ...prev,
        projectExpenses: prev.projectExpenses.map((e) => (e.id === next.id ? next : e)),
      }));
    })();
  };

  const deleteProjectExpense = (id: ID) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const res = await supabase.from("project_expenses").delete().eq("id", id);
      if (res.error) return;
      setState((prev) => ({
        ...prev,
        projectExpenses: prev.projectExpenses.filter((e) => e.id !== id),
      }));
    })();
  };

  const value: RenovationContextValue = {
    ...state,
    createProject,
    updateProject,
    createRoom,
    deleteRoom,
    createTask,
    updateTask,
    deleteTask,
    addTaskDependency,
    removeTaskDependency,
    uploadTaskAttachment,
    removeTaskAttachment,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    addTeamRosterEntry,
    updateTeamRosterEntry,
    deleteTeamRosterEntry,
    createProjectExpense,
    updateProjectExpense,
    deleteProjectExpense,
  };

  return <RenovationContext.Provider value={value}>{children}</RenovationContext.Provider>;
}

export function useRenovation() {
  const ctx = useContext(RenovationContext);
  if (!ctx) throw new Error("useRenovation must be used within RenovationProvider");
  return ctx;
}

export function getRoomsForProject(rooms: Room[], projectId: ID) {
  return rooms.filter((r) => r.projectId === projectId);
}

export function getTasksForRoom(tasks: Task[], roomId: ID) {
  return tasks.filter((t) => t.roomId === roomId);
}
