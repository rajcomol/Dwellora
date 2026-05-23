"use client";

import { DEFAULT_RENOVATION_PHASE, parseRenovationPhase } from "@/lib/renovation/phases";
import { computeBouwdepotBalancesForProjects } from "@/lib/dashboard/bouwdepot";
import { filterTasksForProjectId } from "@/lib/dashboard/projectBudget";
import type {
  ExpenseDocument,
  ExpenseDocumentType,
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
const EXPENSE_DOCUMENTS_BUCKET = "expense_documents";
const MAX_EXPENSE_DOC_BYTES = 10 * 1024 * 1024;

const TASK_SELECT =
  "id,project_id,title,renovation_phase,status,estimated_cost,actual_cost,duration_days,priority,description,sort_order,start_date,assigned_roster_id,funded_by_construction_depot";

/** Ensures roster row belongs to the same project as the task. */
async function resolveAssignedRosterIdForProject(
  projectId: ID,
  rosterId: ID | null | undefined
): Promise<ID | null> {
  if (rosterId == null || rosterId === "") return null;
  const rs = await supabase.from("project_team_roster").select("project_id").eq("id", rosterId).maybeSingle();
  if (rs.error || !rs.data) return null;
  if (String(rs.data.project_id) !== projectId) return null;
  return rosterId;
}

/** Ensures task belongs to project; returns null if invalid. */
async function resolveTaskIdForProjectExpense(projectId: ID, taskId: ID | null | undefined): Promise<ID | null> {
  if (taskId == null || taskId === "") return null;
  const taskRes = await supabase.from("tasks").select("project_id").eq("id", taskId).maybeSingle();
  if (taskRes.error || !taskRes.data) return null;
  if (String(taskRes.data.project_id) !== projectId) return null;
  return taskId;
}

async function getProjectIdForTask(taskId: ID): Promise<ID | null> {
  const taskRes = await supabase.from("tasks").select("project_id").eq("id", taskId).maybeSingle();
  if (taskRes.error || !taskRes.data) return null;
  return String(taskRes.data.project_id);
}

async function resolveProjectIdForTaskInput(roomIds: ID[], projectId?: ID): Promise<ID | null> {
  if (roomIds.length > 0) {
    const roomRes = await supabase.from("rooms").select("project_id").eq("id", roomIds[0]).maybeSingle();
    if (roomRes.error || !roomRes.data) return null;
    return String(roomRes.data.project_id);
  }
  return projectId ?? null;
}

async function validateRoomIdsBelongToProject(roomIds: ID[], projectId: ID): Promise<boolean> {
  if (roomIds.length === 0) return true;
  const res = await supabase.from("rooms").select("id,project_id").in("id", roomIds);
  if (res.error || !res.data || res.data.length !== roomIds.length) return false;
  return res.data.every((r) => String(r.project_id) === projectId);
}

const PROJECT_SELECT =
  "id,name,total_budget,own_contribution,construction_depot_total,address,expected_key_handover,notes,created_at";

function parseNumericNullable(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function computeTotalBudget(own: number | null, depot: number | null): number {
  return (own ?? 0) + (depot ?? 0);
}

type CreateProjectInput = {
  name: string;
  ownContribution?: number | null;
  constructionDepotTotal?: number | null;
  address?: string;
  expectedKeyHandover?: string | null;
  notes?: string;
};

type UpdateProjectInput = {
  id: ID;
  name?: string;
  ownContribution?: number | null;
  constructionDepotTotal?: number | null;
  address?: string;
  expectedKeyHandover?: string | null;
  notes?: string;
};

type CreateTaskInput = {
  title: string;
  /** Required when roomIds is empty (loose task) */
  projectId?: ID;
  roomIds: ID[];
  status: TaskStatus;
  estimatedCost: number | null;
  actualCost?: number;
  durationDays: number;
  priority: TaskPriority;
  description?: string;
  sortOrder?: number;
  startDate?: string | null;
  assignedRosterId?: ID | null;
  renovationPhase?: RenovationPhase;
  fundedByConstructionDepot?: boolean;
};

type UpdateTaskInput = {
  id: ID;
  title?: string;
  status?: TaskStatus;
  estimatedCost?: number | null;
  actualCost?: number;
  durationDays?: number;
  priority?: TaskPriority;
  description?: string;
  sortOrder?: number;
  startDate?: string | null;
  roomIds?: ID[];
  assignedRosterId?: ID | null;
  renovationPhase?: RenovationPhase;
  fundedByConstructionDepot?: boolean;
};

type RenovationActions = {
  createProject: (input: CreateProjectInput) => void;
  updateProject: (input: UpdateProjectInput) => void;
  createRoom: (input: { name: string; projectId: ID }) => void;
  deleteRoom: (id: ID) => void;
  createTask: (input: CreateTaskInput) => Promise<boolean>;
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
    taskId?: ID | null;
    fundedByConstructionDepot?: boolean;
  }) => void;
  updateProjectExpense: (input: {
    id: ID;
    title?: string;
    amount?: number;
    spentOn?: string | null;
    notes?: string;
    taskId?: ID | null;
  }) => void;
  deleteProjectExpense: (id: ID) => void;
  uploadExpenseDocument: (
    expenseId: ID,
    file: File,
    documentType: ExpenseDocumentType
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  removeExpenseDocument: (id: ID) => void;
};

type RenovationContextValue = RenovationState &
  RenovationActions & {
    /** `false` tot de eerste Supabase-load na bekende sessie is afgerond (toon skeleton i.p.v. lege data). */
    isRenovationDataReady: boolean;
  };

const RenovationContext = createContext<RenovationContextValue | undefined>(undefined);

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "todo" || value === "doing" || value === "done";
}

function mapProject(row: {
  id: unknown;
  name: unknown;
  total_budget: unknown;
  own_contribution?: unknown;
  construction_depot_total?: unknown;
  address?: unknown;
  expected_key_handover?: unknown;
  notes?: unknown;
}): Project {
  const ek = row.expected_key_handover;
  const own = parseNumericNullable(row.own_contribution);
  const depot = parseNumericNullable(row.construction_depot_total);
  const storedTotal =
    typeof row.total_budget === "number"
      ? row.total_budget
      : Number.parseFloat(String(row.total_budget ?? "0")) || 0;
  const totalBudget = storedTotal > 0 ? storedTotal : computeTotalBudget(own, depot);
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    totalBudget,
    ownContribution: own,
    constructionDepotTotal: depot,
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

function parseEstimatedCost(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function mapTask(
  row: {
    id: unknown;
    project_id?: unknown;
    title: unknown;
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
    funded_by_construction_depot?: unknown;
  },
  roomIds: ID[]
): Task {
  const rawPriority = row.priority;
  const priority: TaskPriority =
    rawPriority === "low" || rawPriority === "medium" || rawPriority === "high" ? rawPriority : "medium";

  const sd = row.start_date;
  const ar = row.assigned_roster_id;
  const funded = row.funded_by_construction_depot;
  return {
    id: String(row.id),
    projectId: String(row.project_id ?? ""),
    title: String(row.title ?? ""),
    roomIds,
    renovationPhase: parseRenovationPhase(row.renovation_phase),
    status: isTaskStatus(row.status) ? row.status : "todo",
    estimatedCost: parseEstimatedCost(row.estimated_cost),
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
    fundedByConstructionDepot: funded === true || funded === "true",
  };
}

function withBouwdepotBalances(state: RenovationState): RenovationState {
  return {
    ...state,
    projectConstructionDepotBalances: computeBouwdepotBalancesForProjects(
      state.projects,
      state.tasks,
      state.projectExpenses
    ),
  };
}

function buildRoomIdsByTask(rows: { task_id: unknown; room_id: unknown }[]): Map<ID, ID[]> {
  const map = new Map<ID, ID[]>();
  for (const row of rows) {
    const tid = String(row.task_id);
    const rid = String(row.room_id);
    const arr = map.get(tid) ?? [];
    arr.push(rid);
    map.set(tid, arr);
  }
  return map;
}

function mapExpense(row: {
  id: unknown;
  project_id: unknown;
  title: unknown;
  amount: unknown;
  spent_on?: unknown;
  notes?: unknown;
  created_at?: unknown;
  task_id?: unknown;
  funded_by_construction_depot?: unknown;
}): ProjectExpense {
  const so = row.spent_on;
  const tid = row.task_id;
  const funded = row.funded_by_construction_depot;
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    title: String(row.title ?? ""),
    amount:
      typeof row.amount === "number" ? row.amount : Number.parseFloat(String(row.amount ?? "0")) || 0,
    spentOn: so == null || so === "" ? null : String(so),
    notes: String(row.notes ?? ""),
    createdAt: String(row.created_at ?? ""),
    taskId: tid == null || tid === "" ? null : String(tid),
    fundedByConstructionDepot: funded === true || funded === "true",
  };
}

function mapExpenseDocument(row: {
  id: unknown;
  expense_id: unknown;
  project_id: unknown;
  document_type: unknown;
  file_name: unknown;
  file_path: unknown;
  mime_type: unknown;
  file_size_bytes?: unknown;
  uploaded_by?: unknown;
  uploaded_at?: unknown;
  retention_until?: unknown;
  extracted_metadata?: unknown;
}): ExpenseDocument {
  const dt = row.document_type;
  const documentType: ExpenseDocumentType =
    dt === "receipt" || dt === "invoice" || dt === "other" ? dt : "other";
  const fs = row.file_size_bytes;
  const meta = row.extracted_metadata;
  return {
    id: String(row.id),
    expenseId: String(row.expense_id),
    projectId: String(row.project_id),
    documentType,
    fileName: String(row.file_name ?? ""),
    filePath: String(row.file_path ?? ""),
    mimeType: String(row.mime_type ?? ""),
    fileSizeBytes:
      typeof fs === "number" ? fs : fs != null ? Number.parseInt(String(fs), 10) || null : null,
    uploadedBy: row.uploaded_by == null || row.uploaded_by === "" ? null : String(row.uploaded_by),
    uploadedAt: String(row.uploaded_at ?? ""),
    retentionUntil:
      row.retention_until == null || row.retention_until === "" ? null : String(row.retention_until),
    extractedMetadata:
      meta != null && typeof meta === "object" && !Array.isArray(meta)
        ? (meta as Record<string, unknown>)
        : {},
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

function emptyRenovationState(): RenovationState {
  return {
    projects: [],
    rooms: [],
    tasks: [],
    projectConstructionDepotBalances: [],
    projectExpenses: [],
    expenseDocuments: [],
    taskDependencies: [],
    taskAttachments: [],
    checklistItems: [],
    teamRoster: [],
  };
}

/** Ensures context consumers never see undefined arrays (avoids `.map` crashes). */
function normalizeRenovationState(state: RenovationState): RenovationState {
  const base: RenovationState = {
    projects: state.projects ?? [],
    rooms: state.rooms ?? [],
    tasks: state.tasks ?? [],
    projectConstructionDepotBalances: state.projectConstructionDepotBalances ?? [],
    projectExpenses: state.projectExpenses ?? [],
    expenseDocuments: state.expenseDocuments ?? [],
    taskDependencies: state.taskDependencies ?? [],
    taskAttachments: state.taskAttachments ?? [],
    checklistItems: state.checklistItems ?? [],
    teamRoster: state.teamRoster ?? [],
  };
  return withBouwdepotBalances(base);
}

export function RenovationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RenovationState>(emptyRenovationState);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [isRenovationDataReady, setIsRenovationDataReady] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSessionUserId(data.session?.user.id ?? null);
      setSessionResolved(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUserId(session?.user.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionResolved) return;
    let cancelled = false;

    async function loadAll() {
      const failLoad = (label: string, detail?: string) => {
        if (cancelled) return;
        console.error("Failed to load renovation data", { label, detail });
        setState(emptyRenovationState());
      };

      if (!sessionUserId) {
        setState(emptyRenovationState());
        if (!cancelled) setIsRenovationDataReady(true);
        return;
      }

      setIsRenovationDataReady(false);
      try {
      const projectsRes = await supabase
        .from("projects")
        .select(PROJECT_SELECT)
        .eq("user_id", sessionUserId);

      if (projectsRes.error) {
        failLoad("projects", projectsRes.error.message);
        return;
      }

      const membersRes = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", sessionUserId);

      if (membersRes.error) {
        console.warn("Failed to load project memberships", membersRes.error.message);
      }

      const ownedRows = projectsRes.data ?? [];
      const sharedProjectIds = [
        ...new Set(
          (membersRes.data ?? [])
            .map((m) => (m.project_id != null ? String(m.project_id) : ""))
            .filter(Boolean)
        ),
      ];

      let sharedRows: typeof ownedRows = [];
      if (sharedProjectIds.length > 0) {
        const sharedRes = await supabase
          .from("projects")
          .select(PROJECT_SELECT)
          .in("id", sharedProjectIds);
        if (sharedRes.error) {
          console.warn("Failed to load shared projects", sharedRes.error.message);
        } else {
          sharedRows = sharedRes.data ?? [];
        }
      }

      const mergedById = new Map<string, (typeof ownedRows)[number]>();
      for (const row of ownedRows) {
        mergedById.set(String(row.id), row);
      }
      for (const row of sharedRows) {
        const id = String(row.id);
        if (!mergedById.has(id)) {
          mergedById.set(id, row);
        }
      }
      const mergedProjects = Array.from(mergedById.values());

      if (mergedProjects.length === 0) {
        if (cancelled) return;
        setState(emptyRenovationState());
        return;
      }

      const projectIds = mergedProjects.map((p) => String(p.id));

      const roomsRes = await supabase.from("rooms").select("id,name,project_id").in("project_id", projectIds);

      if (roomsRes.error) {
        failLoad("rooms", roomsRes.error.message);
        return;
      }

      const roomIds = (roomsRes.data ?? []).map((r) => String(r.id));

      const taskRoomsRes =
        roomIds.length > 0
          ? await supabase.from("task_rooms").select("task_id,room_id").in("room_id", roomIds)
          : { data: [] as { task_id: unknown; room_id: unknown }[], error: null };

      if (taskRoomsRes.error) {
        failLoad("task_rooms", taskRoomsRes.error.message);
        return;
      }

      const roomIdsByTask = buildRoomIdsByTask(taskRoomsRes.data ?? []);
      const linkedTaskIds = [...roomIdsByTask.keys()];

      const tasksByProjectRes = await supabase
        .from("tasks")
        .select(TASK_SELECT)
        .in("project_id", projectIds);
      const tasksByIdRes =
        linkedTaskIds.length > 0
          ? await supabase.from("tasks").select(TASK_SELECT).in("id", linkedTaskIds)
          : { data: [] as Record<string, unknown>[], error: null };

      if (tasksByProjectRes.error) {
        failLoad("tasks", tasksByProjectRes.error.message);
        return;
      }
      if (tasksByIdRes.error) {
        console.warn("Failed to load linked tasks by id", tasksByIdRes.error.message);
      }

      const mergedTaskRowsById = new Map<string, Record<string, unknown>>();
      for (const row of tasksByProjectRes.data ?? []) {
        mergedTaskRowsById.set(String(row.id), row as Record<string, unknown>);
      }
      for (const row of tasksByIdRes.data ?? []) {
        mergedTaskRowsById.set(String(row.id), row as Record<string, unknown>);
      }
      const mergedTaskRows = [...mergedTaskRowsById.values()];
      const taskIds = mergedTaskRows.map((r) => String(r.id));

      const ext = await Promise.all([
        supabase
          .from("project_expenses")
          .select("id,project_id,title,amount,spent_on,notes,created_at,task_id,funded_by_construction_depot")
          .in("project_id", projectIds),
        supabase
          .from("expense_documents")
          .select(
            "id,expense_id,project_id,document_type,file_name,file_path,mime_type,file_size_bytes,uploaded_by,uploaded_at,retention_until,extracted_metadata"
          )
          .in("project_id", projectIds),
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

      const [expensesRes, expenseDocsRes, depsRes, attRes, checklistRes, rosterRes] = ext;
      const logExt = (label: string, err: { message: string } | null) => {
        if (err) console.warn(`Renovation extension load (${label}):`, err.message);
      };
      logExt("project_expenses", expensesRes.error);
      logExt("expense_documents", expenseDocsRes.error);
      logExt("task_dependencies", depsRes.error);
      logExt("task_attachments", attRes.error);
      logExt("checklist", checklistRes.error);
      logExt("team_roster", rosterRes.error);

      const loadedProjects = mergedProjects.map((r) => mapProject(r as Parameters<typeof mapProject>[0]));
      const loadedTasks = mergedTaskRows.map((r) => {
        const id = String(r.id);
        return mapTask(r as Parameters<typeof mapTask>[0], roomIdsByTask.get(id) ?? []);
      });

      setState(
        withBouwdepotBalances({
        projects: loadedProjects,
        rooms: (roomsRes.data ?? []).map((r) =>
          mapRoom(r as { id: unknown; name: unknown; project_id: unknown })
        ),
        tasks: loadedTasks,
        projectConstructionDepotBalances: [],
        projectExpenses: expensesRes.error
          ? []
          : (expensesRes.data ?? []).map((r) => mapExpense(r as Parameters<typeof mapExpense>[0])),
        expenseDocuments: expenseDocsRes.error
          ? []
          : (expenseDocsRes.data ?? []).map((r) =>
              mapExpenseDocument(r as Parameters<typeof mapExpenseDocument>[0])
            ),
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
        })
      );
      } finally {
        if (!cancelled) setIsRenovationDataReady(true);
      }
    }

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [sessionUserId, sessionResolved]);

  const createProject = (input: CreateProjectInput) => {
    const trimmed = input.name.trim();
    if (!trimmed) return;

    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) return;

      const own = input.ownContribution ?? null;
      const depot = input.constructionDepotTotal ?? null;
      const row = {
        name: trimmed,
        own_contribution: own,
        construction_depot_total: depot,
        total_budget: computeTotalBudget(own, depot),
        user_id: uid,
        address: (input.address ?? "").trim(),
        expected_key_handover: input.expectedKeyHandover?.trim() || null,
        notes: (input.notes ?? "").trim(),
      };

      const res = await supabase
        .from("projects")
        .insert(row)
        .select(PROJECT_SELECT)
        .single();

      if (res.error || !res.data) return;
      setState((prev) =>
        withBouwdepotBalances({ ...prev, projects: [...prev.projects, mapProject(res.data)] })
      );
    })();
  };

  const updateProject = (input: UpdateProjectInput) => {
    let existing: Project | undefined;
    setState((prev) => {
      existing = prev.projects.find((p) => p.id === input.id);
      return prev;
    });

    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.ownContribution !== undefined) patch.own_contribution = input.ownContribution;
      if (input.constructionDepotTotal !== undefined) {
        patch.construction_depot_total = input.constructionDepotTotal;
      }
      if (input.ownContribution !== undefined || input.constructionDepotTotal !== undefined) {
        const own =
          input.ownContribution !== undefined ? input.ownContribution : (existing?.ownContribution ?? null);
        const depot =
          input.constructionDepotTotal !== undefined
            ? input.constructionDepotTotal
            : (existing?.constructionDepotTotal ?? null);
        patch.total_budget = computeTotalBudget(own, depot);
      }
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
        .select(PROJECT_SELECT)
        .single();

      if (res.error || !res.data) return;
      const next = mapProject(res.data);
      setState((prev) =>
        withBouwdepotBalances({
          ...prev,
          projects: prev.projects.map((p) => (p.id === next.id ? next : p)),
        })
      );
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
      setState((prev) => ({ ...prev, rooms: [...(prev.rooms ?? []), mapRoom(res.data)] }));
    })();
  };

  const deleteRoom = (roomId: ID) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const trRes = await supabase.from("task_rooms").select("task_id").eq("room_id", roomId);
      if (trRes.error) return;
      const linkedTaskIds = (trRes.data ?? []).map((r: { task_id: unknown }) => String(r.task_id));

      const orphanTaskIds: ID[] = [];
      for (const taskId of linkedTaskIds) {
        const other = await supabase
          .from("task_rooms")
          .select("room_id")
          .eq("task_id", taskId)
          .neq("room_id", roomId);
        if (!other.error && (other.data ?? []).length === 0) {
          orphanTaskIds.push(taskId);
        }
      }

      if (orphanTaskIds.length > 0) {
        const attsRes = await supabase
          .from("task_attachments")
          .select("file_path")
          .in("task_id", orphanTaskIds);
        if (!attsRes.error) {
          const paths = (attsRes.data ?? [])
            .map((r: { file_path?: unknown }) => (typeof r.file_path === "string" ? r.file_path : ""))
            .filter(Boolean);
          if (paths.length > 0) {
            await supabase.storage.from(DOCUMENTS_BUCKET).remove(paths);
          }
        }
        await supabase.from("tasks").delete().in("id", orphanTaskIds);
      }

      const res = await supabase.from("rooms").delete().eq("id", roomId);
      if (res.error) return;

      setState((prev) => {
        const orphanSet = new Set(orphanTaskIds);
        const nextTasks = (prev.tasks ?? [])
          .filter((t) => !orphanSet.has(t.id))
          .map((t) => ({
            ...t,
            roomIds: (t.roomIds ?? []).filter((rid) => rid !== roomId),
          }));
        const keptIds = new Set(nextTasks.map((t) => t.id));
        return {
          ...prev,
          rooms: (prev.rooms ?? []).filter((r) => r.id !== roomId),
          tasks: nextTasks,
          taskDependencies: (prev.taskDependencies ?? []).filter(
            (d) => keptIds.has(d.taskId) && keptIds.has(d.dependsOnTaskId)
          ),
          taskAttachments: prev.taskAttachments.filter((a) => keptIds.has(a.taskId)),
        };
      });
    })();
  };

  const createTask = async (input: CreateTaskInput): Promise<boolean> => {
    const trimmed = input.title.trim();
    if (!trimmed) return false;
    if (input.estimatedCost !== null && !Number.isFinite(input.estimatedCost)) return false;
    if (!Number.isFinite(input.durationDays)) return false;
    const roomIds = [...new Set(input.roomIds.filter(Boolean))];

    const actualCost = input.actualCost ?? 0;
    if (!Number.isFinite(actualCost)) return false;

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return false;

    const resolvedProjectId = await resolveProjectIdForTaskInput(roomIds, input.projectId);
    if (!resolvedProjectId) return false;

    if (!(await validateRoomIdsBelongToProject(roomIds, resolvedProjectId))) {
      console.error("createTask: selected rooms do not belong to project", resolvedProjectId);
      return false;
    }

    let sortOrder = input.sortOrder;
      if (sortOrder === undefined) {
        if (roomIds.length > 0) {
          const trOrd = await supabase.from("task_rooms").select("task_id").in("room_id", roomIds);
          const ordTaskIds = [...new Set((trOrd.data ?? []).map((r: { task_id: unknown }) => String(r.task_id)))];
          if (ordTaskIds.length > 0) {
            const ordRes = await supabase.from("tasks").select("sort_order").in("id", ordTaskIds);
            const nums = (ordRes.data ?? []).map((r: { sort_order?: unknown }) =>
              typeof r.sort_order === "number" ? r.sort_order : Number(r.sort_order ?? 0) || 0
            );
            sortOrder = Math.max(-1, ...nums) + 1;
          } else {
            sortOrder = 0;
          }
        } else {
          const ordRes = await supabase
            .from("tasks")
            .select("sort_order")
            .eq("project_id", resolvedProjectId);
          const nums = (ordRes.data ?? []).map((r: { sort_order?: unknown }) =>
            typeof r.sort_order === "number" ? r.sort_order : Number(r.sort_order ?? 0) || 0
          );
          sortOrder = nums.length > 0 ? Math.max(-1, ...nums) + 1 : 0;
        }
      }

      const assignedRosterId = await resolveAssignedRosterIdForProject(
        resolvedProjectId,
        input.assignedRosterId
      );

      const renovationPhase = input.renovationPhase ?? DEFAULT_RENOVATION_PHASE;

      const rpcRes = await supabase.rpc("create_project_task", {
        p_project_id: resolvedProjectId,
        p_title: trimmed,
        p_renovation_phase: renovationPhase,
        p_status: input.status,
        p_estimated_cost: input.estimatedCost,
        p_actual_cost: actualCost,
        p_duration_days: input.durationDays,
        p_priority: input.priority,
        p_description: (input.description ?? "").trim(),
        p_sort_order: sortOrder ?? 0,
        p_start_date: input.startDate?.trim() || null,
        p_assigned_roster_id: assignedRosterId,
        p_funded_by_construction_depot: input.fundedByConstructionDepot === true,
        p_room_ids: roomIds,
      });

      let taskRow: Parameters<typeof mapTask>[0] | null = null;

      if (!rpcRes.error && rpcRes.data) {
        const raw = rpcRes.data as Parameters<typeof mapTask>[0] | Parameters<typeof mapTask>[0][];
        taskRow = (Array.isArray(raw) ? raw[0] : raw) ?? null;
      } else if (
        rpcRes.error &&
        rpcRes.error.code !== "PGRST202" &&
        rpcRes.error.code !== "42883"
      ) {
        console.error("createTask: create_project_task rpc failed", rpcRes.error.message);
        return false;
      }

      if (!taskRow) {
        const taskId = crypto.randomUUID();
        const insertRow = {
          id: taskId,
          project_id: resolvedProjectId,
          title: trimmed,
          renovation_phase: renovationPhase,
          status: input.status,
          estimated_cost: input.estimatedCost,
          actual_cost: actualCost,
          duration_days: input.durationDays,
          priority: input.priority,
          description: (input.description ?? "").trim(),
          sort_order: sortOrder,
          start_date: input.startDate?.trim() || null,
          assigned_roster_id: assignedRosterId,
          funded_by_construction_depot: input.fundedByConstructionDepot === true,
        };

        const ins = await supabase.from("tasks").insert(insertRow);
        if (ins.error) {
          console.error("createTask: tasks insert failed", ins.error.message, {
            projectId: resolvedProjectId,
            roomIds,
          });
          return false;
        }

        if (roomIds.length > 0) {
          const trIns = await supabase
            .from("task_rooms")
            .insert(roomIds.map((roomId) => ({ task_id: taskId, room_id: roomId })));
          if (trIns.error) {
            console.error("createTask: task_rooms insert failed", trIns.error.message);
            await supabase.from("tasks").delete().eq("id", taskId);
            return false;
          }
        }

        taskRow = insertRow;
      }

      if (!taskRow) {
        return false;
      }

    const nextTask = mapTask(taskRow, roomIds);

    setState((prev) =>
      withBouwdepotBalances({ ...prev, tasks: [...(prev.tasks ?? []), nextTask] })
    );
    return true;
  };

  const updateTask = async (input: UpdateTaskInput): Promise<boolean> => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return false;

    const existing = (state.tasks ?? []).find((t) => t.id === input.id);
    if (!existing) return false;

    let effectiveRoomIds = existing.roomIds;
    if (input.roomIds !== undefined) {
      effectiveRoomIds = [...new Set(input.roomIds.filter(Boolean))];
    }

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
    if (input.renovationPhase !== undefined) patch.renovation_phase = input.renovationPhase;
    if (input.fundedByConstructionDepot !== undefined) {
      patch.funded_by_construction_depot = input.fundedByConstructionDepot;
    }
    if (input.assignedRosterId !== undefined) {
      patch.assigned_roster_id = await resolveAssignedRosterIdForProject(
        existing.projectId,
        input.assignedRosterId
      );
    }

    const roomsChanged =
      input.roomIds !== undefined &&
      (input.roomIds.length !== existing.roomIds.length ||
        !input.roomIds.every((id) => existing.roomIds.includes(id)));

    if (Object.keys(patch).length === 0 && !roomsChanged) return true;

    if (Object.keys(patch).length > 0) {
      const res = await supabase.from("tasks").update(patch).eq("id", input.id).select(TASK_SELECT).single();
      if (res.error || !res.data) return false;
    }

    if (roomsChanged) {
      await supabase.from("task_rooms").delete().eq("task_id", input.id);
      if (effectiveRoomIds.length > 0) {
        const trIns = await supabase
          .from("task_rooms")
          .insert(effectiveRoomIds.map((roomId) => ({ task_id: input.id, room_id: roomId })));
        if (trIns.error) return false;
      }
    }

    const fresh = await supabase.from("tasks").select(TASK_SELECT).eq("id", input.id).single();
    if (fresh.error || !fresh.data) return false;

    const next = mapTask(fresh.data as Parameters<typeof mapTask>[0], effectiveRoomIds);
    setState((prev) =>
      withBouwdepotBalances({
        ...prev,
        tasks: (prev.tasks ?? []).map((tk) => (tk.id === next.id ? next : tk)),
      })
    );
    return true;
  };

  const deleteTask = (id: ID) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const expDel = await supabase.from("project_expenses").delete().eq("task_id", id);
      if (expDel.error) {
        console.error("deleteTask: project_expenses delete failed", expDel.error.message);
        return;
      }

      const res = await supabase.from("tasks").delete().eq("id", id);
      if (res.error) {
        console.error("deleteTask: tasks delete failed", res.error.message);
        return;
      }
      setState((prev) =>
        withBouwdepotBalances({
          ...prev,
          tasks: (prev.tasks ?? []).filter((t) => t.id !== id),
          projectExpenses: (prev.projectExpenses ?? []).filter((e) => e.taskId !== id),
          taskDependencies: prev.taskDependencies.filter(
            (d) => d.taskId !== id && d.dependsOnTaskId !== id
          ),
          taskAttachments: prev.taskAttachments.filter((a) => a.taskId !== id),
        })
      );
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

    const projectId = await getProjectIdForTask(taskId);
    if (!projectId) return { ok: false, error: "Taak niet gevonden." };

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const path = `${projectId}/tasks/${taskId}/${safeName}`;

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
        tasks: (prev.tasks ?? []).map((t) =>
          t.assignedRosterId === id ? { ...t, assignedRosterId: null } : t
        ),
      }));
    })();
  };

  const createProjectExpense = (input: {
    projectId: ID;
    title: string;
    amount: number;
    spentOn?: string | null;
    notes?: string;
    taskId?: ID | null;
    fundedByConstructionDepot?: boolean;
  }) => {
    const title = input.title.trim();
    if (!title) return;
    if (!Number.isFinite(input.amount) || input.amount < 0) return;

    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const taskId = await resolveTaskIdForProjectExpense(input.projectId, input.taskId ?? null);

      const res = await supabase
        .from("project_expenses")
        .insert({
          project_id: input.projectId,
          title,
          amount: input.amount,
          spent_on: input.spentOn?.trim() || null,
          notes: (input.notes ?? "").trim(),
          task_id: taskId,
          funded_by_construction_depot: input.fundedByConstructionDepot === true,
        })
        .select("id,project_id,title,amount,spent_on,notes,created_at,task_id,funded_by_construction_depot")
        .single();

      if (res.error || !res.data) return;
      setState((prev) =>
        withBouwdepotBalances({
          ...prev,
          projectExpenses: [...(prev.projectExpenses ?? []), mapExpense(res.data)],
        })
      );
    })();
  };

  const updateProjectExpense = (input: {
    id: ID;
    title?: string;
    amount?: number;
    spentOn?: string | null;
    notes?: string;
    taskId?: ID | null;
  }) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const patch: Record<string, unknown> = {};
      if (input.title !== undefined) patch.title = input.title.trim();
      if (input.amount !== undefined) patch.amount = input.amount;
      if (input.spentOn !== undefined) patch.spent_on = input.spentOn?.trim() || null;
      if (input.notes !== undefined) patch.notes = input.notes.trim();
      if (input.taskId !== undefined) {
        const expRow = await supabase.from("project_expenses").select("project_id").eq("id", input.id).maybeSingle();
        const pid = expRow.data?.project_id != null ? String(expRow.data.project_id) : null;
        patch.task_id = pid ? await resolveTaskIdForProjectExpense(pid, input.taskId) : null;
      }
      if (Object.keys(patch).length === 0) return;

      const res = await supabase
        .from("project_expenses")
        .update(patch)
        .eq("id", input.id)
        .select("id,project_id,title,amount,spent_on,notes,created_at,task_id")
        .single();

      if (res.error || !res.data) return;
      const next = mapExpense(res.data);
      setState((prev) => ({
        ...prev,
        projectExpenses: (prev.projectExpenses ?? []).map((e) => (e.id === next.id ? next : e)),
      }));
    })();
  };

  const deleteProjectExpense = (id: ID) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const docsRes = await supabase.from("expense_documents").select("file_path").eq("expense_id", id);
      if (!docsRes.error && docsRes.data?.length) {
        const paths = docsRes.data
          .map((r: { file_path?: unknown }) => (typeof r.file_path === "string" ? r.file_path : ""))
          .filter(Boolean);
        if (paths.length > 0) {
          await supabase.storage.from(EXPENSE_DOCUMENTS_BUCKET).remove(paths);
        }
      }

      const res = await supabase.from("project_expenses").delete().eq("id", id);
      if (res.error) return;
      setState((prev) => ({
        ...prev,
        projectExpenses: (prev.projectExpenses ?? []).filter((e) => e.id !== id),
        expenseDocuments: prev.expenseDocuments.filter((d) => d.expenseId !== id),
      }));
    })();
  };

  const uploadExpenseDocument = async (
    expenseId: ID,
    file: File,
    documentType: ExpenseDocumentType
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return { ok: false, error: "Niet ingelogd." };

    if (file.size > MAX_EXPENSE_DOC_BYTES) {
      return { ok: false, error: "Bestand is te groot (max. 10 MB)." };
    }

    const allowed = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ]);
    if (!allowed.has(file.type)) {
      return { ok: false, error: "Alleen PDF of afbeelding (JPEG, PNG, WebP, HEIC)." };
    }

    const expRes = await supabase.from("project_expenses").select("id,project_id").eq("id", expenseId).maybeSingle();
    if (expRes.error || !expRes.data) return { ok: false, error: "Uitgave niet gevonden." };

    const projectId = String(expRes.data.project_id);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const objectName = `${crypto.randomUUID()}_${safeName}`;
    const path = `${projectId}/expenses/${expenseId}/${objectName}`;

    const up = await supabase.storage.from(EXPENSE_DOCUMENTS_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
    if (up.error) return { ok: false, error: up.error.message };

    const ins = await supabase
      .from("expense_documents")
      .insert({
        expense_id: expenseId,
        project_id: projectId,
        document_type: documentType,
        file_name: file.name,
        file_path: path,
        mime_type: file.type || "application/octet-stream",
        file_size_bytes: file.size,
      })
      .select(
        "id,expense_id,project_id,document_type,file_name,file_path,mime_type,file_size_bytes,uploaded_by,uploaded_at,retention_until,extracted_metadata"
      )
      .single();

    if (ins.error || !ins.data) {
      await supabase.storage.from(EXPENSE_DOCUMENTS_BUCKET).remove([path]);
      return { ok: false, error: ins.error?.message ?? "Kon document niet opslaan." };
    }

    setState((prev) => ({
      ...prev,
      expenseDocuments: [...prev.expenseDocuments, mapExpenseDocument(ins.data)],
    }));
    return { ok: true };
  };

  const removeExpenseDocument = (id: ID) => {
    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const row = await supabase.from("expense_documents").select("file_path").eq("id", id).maybeSingle();
      const fp = row.data?.file_path;
      if (typeof fp === "string" && fp) {
        await supabase.storage.from(EXPENSE_DOCUMENTS_BUCKET).remove([fp]);
      }

      const res = await supabase.from("expense_documents").delete().eq("id", id);
      if (res.error) return;
      setState((prev) => ({
        ...prev,
        expenseDocuments: prev.expenseDocuments.filter((d) => d.id !== id),
      }));
    })();
  };

  const value: RenovationContextValue = {
    ...normalizeRenovationState(state),
    isRenovationDataReady,
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
    uploadExpenseDocument,
    removeExpenseDocument,
  };

  return <RenovationContext.Provider value={value}>{children}</RenovationContext.Provider>;
}

export function useRenovation() {
  const ctx = useContext(RenovationContext);
  if (!ctx) throw new Error("useRenovation must be used within RenovationProvider");
  const {
    projects,
    rooms,
    tasks,
    projectConstructionDepotBalances,
    projectExpenses,
    expenseDocuments,
    taskDependencies,
    taskAttachments,
    checklistItems,
    teamRoster,
    ...rest
  } = ctx;
  return {
    ...rest,
    projects: projects ?? [],
    rooms: rooms ?? [],
    tasks: tasks ?? [],
    projectConstructionDepotBalances: projectConstructionDepotBalances ?? [],
    projectExpenses: projectExpenses ?? [],
    expenseDocuments: expenseDocuments ?? [],
    taskDependencies: taskDependencies ?? [],
    taskAttachments: taskAttachments ?? [],
    checklistItems: checklistItems ?? [],
    teamRoster: teamRoster ?? [],
  };
}

export function getRoomsForProject(rooms: Room[], projectId: ID) {
  return rooms.filter((r) => r.projectId === projectId);
}

export function getTasksForRoom(tasks: Task[], roomId: ID) {
  return (tasks ?? []).filter((t) => (t.roomIds ?? []).includes(roomId));
}

export function taskBelongsToProject(tasks: Task[], rooms: Room[], projectId: ID): boolean {
  const roomIds = new Set(rooms.filter((r) => r.projectId === projectId).map((r) => r.id));
  return tasks.some((t) => t.roomIds.some((rid) => roomIds.has(rid)));
}

export function filterTasksForProject(tasks: Task[], rooms: Room[], projectId: ID): Task[] {
  const roomIds = new Set((rooms ?? []).filter((r) => r.projectId === projectId).map((r) => r.id));
  return filterTasksForProjectId(tasks ?? [], projectId, roomIds);
}
