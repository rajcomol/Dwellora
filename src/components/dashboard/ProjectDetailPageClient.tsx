"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { filterTasksForProject, useRenovation } from "@/components/dashboard/RenovationProvider";
import {
  formatEstimatedCostDisplay,
  sumEstimatedCostsForRoom,
  sumEstimatedCostsUnique,
} from "@/lib/dashboard/taskCosts";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { DEFAULT_RENOVATION_PHASE, RENOVATION_PHASE_ORDER } from "@/lib/renovation/phases";
import type {
  ID,
  Project,
  RenovationPhase,
  Room,
  Task,
  TaskAttachment,
  TaskDependency,
  TaskPriority,
  TaskStatus,
  TeamRosterEntry,
} from "@/lib/renovation/types";
import { formatCurrency as formatCost } from "@/lib/format/currency";
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import type { TranslateFn } from "@/i18n/create-translator";
import { useI18n } from "@/i18n/provider";
import { sortTasksForPlanning } from "@/lib/renovation/planningSort";
import {
  checklistItemTitleSchema,
  projectUpdateFormSchema,
  rosterEntryFormSchema,
  roomNameFormSchema,
  taskFormFieldsSchema,
} from "@/lib/validation/schemas";
import ProjectCollaborationSection from "@/components/dashboard/ProjectCollaborationSection";
import { ProjectDetailPageSkeleton } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabase/client";
import type { ZodError } from "zod";

const FORM_FIELD_LABEL_CLASS = "mb-1 block text-xs font-medium text-renovation-concrete";

function taskFormZodMessage(t: TranslateFn, err: ZodError): string {
  const path = err.issues[0]?.path[0];
  if (path === "title") return t("projectDetail.taskTitleRequired");
  if (path === "roomIds") return t("projectDetail.roomsRequired");
  if (path === "estimatedCost" || path === "actualCost") return t("projectDetail.taskCostsNumber");
  if (path === "durationDays") return t("projectDetail.taskDurationInvalid");
  return t("validation.generic");
}

function RoomIdsMultiSelect({
  idPrefix,
  rooms,
  selectedIds,
  onChange,
}: {
  idPrefix: string;
  rooms: Room[];
  selectedIds: ID[];
  onChange: (ids: ID[]) => void;
}) {
  const { t } = useI18n();
  function toggle(roomId: ID) {
    if (selectedIds.includes(roomId)) {
      const next = selectedIds.filter((x) => x !== roomId);
      if (next.length > 0) onChange(next);
    } else {
      onChange([...selectedIds, roomId]);
    }
  }
  return (
    <fieldset className="space-y-1">
      <legend className={FORM_FIELD_LABEL_CLASS}>{t("projectDetail.labelRooms")}</legend>
      <div className="flex flex-wrap gap-2">
        {rooms.map((r) => (
          <label
            key={r.id}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-renovation-border px-2 py-1 text-xs dark:border-renovation-border"
          >
            <input
              id={`${idPrefix}-room-${r.id}`}
              type="checkbox"
              checked={selectedIds.includes(r.id)}
              onChange={() => toggle(r.id)}
            />
            {r.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function statusBadge(status: TaskStatus) {
  switch (status) {
    case "todo":
      return "bg-renovation-surface text-foreground dark:bg-renovation-muted dark:text-foreground";
    case "doing":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "done":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
  }
}

function TaskEditor({
  task,
  projectId,
  linkedRoomNames,
  projectRooms,
  depotOptions,
  projectTaskOptions,
  rosterOptions,
  deps,
  attachments,
  onUpdate,
  onDelete,
  onAddDep,
  onRemoveDep,
  onUploadFile,
  onRemoveAttachment,
}: {
  task: Task;
  projectId: ID;
  linkedRoomNames: string;
  projectRooms: Room[];
  depotOptions: { id: ID; name: string }[];
  projectTaskOptions: Task[];
  rosterOptions: TeamRosterEntry[];
  deps: TaskDependency[];
  attachments: TaskAttachment[];
  onUpdate: (patch: {
    id: ID;
    title?: string;
    status?: TaskStatus;
    estimatedCost?: number | null;
    actualCost?: number;
    durationDays?: number;
    priority?: TaskPriority;
    description?: string;
    startDate?: string | null;
    roomIds?: ID[];
    assignedRosterId?: ID | null;
    renovationPhase?: RenovationPhase;
    constructionDepotId?: ID | null;
  }) => Promise<boolean>;
  onDelete: () => void;
  onAddDep: (dependsOnTaskId: ID) => void;
  onRemoveDep: (depId: ID) => void;
  onUploadFile: (file: File) => Promise<void>;
  onRemoveAttachment: (id: ID) => void;
}) {
  const { t } = useI18n();
  const { projectExpenses } = useRenovation();
  const linkedExpenses = useMemo(
    () => projectExpenses.filter((e) => e.taskId === task.id),
    [projectExpenses, task.id]
  );
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [selectedRoomIds, setSelectedRoomIds] = useState<ID[]>(task.roomIds);
  const [constructionDepotId, setConstructionDepotId] = useState(task.constructionDepotId ?? "");
  const [estimatedCost, setEstimatedCost] = useState(
    task.estimatedCost == null ? "" : String(task.estimatedCost)
  );
  const [actualCost, setActualCost] = useState(String(task.actualCost));
  const [durationDays, setDurationDays] = useState(String(task.durationDays));
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [description, setDescription] = useState(task.description);
  const [startDate, setStartDate] = useState(task.startDate ?? "");
  const [renovationPhase, setRenovationPhase] = useState<RenovationPhase>(task.renovationPhase);
  const [assignedRosterId, setAssignedRosterId] = useState(task.assignedRosterId ?? "");
  const [depPick, setDepPick] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setSaveError(null);
    setJustSaved(false);
  }, [task.id]);

  useEffect(() => {
    if (!justSaved) return;
    const tmr = window.setTimeout(() => setJustSaved(false), 4000);
    return () => window.clearTimeout(tmr);
  }, [justSaved]);

  useEffect(() => {
    setTitle(task.title);
    setStatus(task.status);
    setSelectedRoomIds(task.roomIds);
    setConstructionDepotId(task.constructionDepotId ?? "");
    setEstimatedCost(task.estimatedCost == null ? "" : String(task.estimatedCost));
    setActualCost(String(task.actualCost));
    setDurationDays(String(task.durationDays));
    setPriority(task.priority);
    setDescription(task.description);
    setStartDate(task.startDate ?? "");
    setRenovationPhase(task.renovationPhase);
    setAssignedRosterId(task.assignedRosterId ?? "");
  }, [
    task.id,
    task.title,
    task.status,
    task.estimatedCost,
    task.actualCost,
    task.durationDays,
    task.priority,
    task.description,
    task.startDate,
    task.assignedRosterId,
    task.renovationPhase,
    task.roomIds,
    task.constructionDepotId,
  ]);

  const assigneeLabel =
    task.assignedRosterId != null
      ? (rosterOptions.find((r) => r.id === task.assignedRosterId)?.displayName ?? t("projectDetail.assigneeUnknown"))
      : t("projectDetail.assigneeUnassigned");

  async function signedUrl(path: string) {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 600);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  }

  return (
    <li className="rounded-md border border-renovation-border bg-renovation-elevated p-3 dark:border-renovation-border dark:bg-renovation-elevated">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{task.title}</div>
          <div className="mt-1 text-xs text-renovation-concrete">
            {linkedRoomNames} •{" "}
            {formatEstimatedCostDisplay(task.estimatedCost, formatCost, t("projectDetail.noEstimate"))}{" "}
            {t("projectDetail.estShort")} • {formatCost(task.actualCost)}{" "}
            {t("projectDetail.actualShort")} • {task.durationDays}d
          </div>
          <div className="mt-1 text-xs text-renovation-concrete">
            {t(`renovationPhase.${task.renovationPhase}`)}
            {" • "}
            {t(`task.priority.${task.priority}`)}
            {task.startDate ? ` • ${t("projectDetail.startsOn", { date: formatDisplayDate(task.startDate) })}` : ""}
            {" • "}
            {assigneeLabel}
          </div>
          {justSaved ? (
            <p className="mt-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400" role="status">
              {t("projectDetail.taskSaveSuccess")}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className={["rounded-md px-2 py-1 text-[11px] font-medium", statusBadge(task.status)].join(" ")}>
            {t(`task.status.${task.status}`)}
          </div>
          <button
            type="button"
            onClick={() =>
              setOpen((o) => {
                const next = !o;
                if (next) {
                  setJustSaved(false);
                  setSaveError(null);
                }
                return next;
              })
            }
            className="text-xs font-medium text-foreground underline"
          >
            {open ? t("common.close") : t("common.edit")}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-3 space-y-3 border-t border-renovation-border pt-3 dark:border-renovation-border">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`task-edit-${task.id}-title`} className={FORM_FIELD_LABEL_CLASS}>
                {t("projectDetail.labelTaskTitle")}
              </label>
              <input
                id={`task-edit-${task.id}-title`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("projectDetail.taskTitlePlaceholder")}
                className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-2 py-1.5 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
              />
            </div>
            <div>
              <label htmlFor={`task-edit-${task.id}-status`} className={FORM_FIELD_LABEL_CLASS}>
                {t("projectDetail.labelTaskStatus")}
              </label>
              <select
                id={`task-edit-${task.id}-status`}
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-2 py-1.5 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
              >
                <option value="todo">{t("task.status.todo")}</option>
                <option value="doing">{t("task.status.doing")}</option>
                <option value="done">{t("task.status.done")}</option>
              </select>
            </div>
            <div>
              <label htmlFor={`task-edit-${task.id}-est`} className={FORM_FIELD_LABEL_CLASS}>
                {t("projectDetail.estimatedCost")}
              </label>
              <input
                id={`task-edit-${task.id}-est`}
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-2 py-1.5 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
              />
            </div>
            <div>
              <label htmlFor={`task-edit-${task.id}-act`} className={FORM_FIELD_LABEL_CLASS}>
                {t("projectDetail.actualCost")}
              </label>
              <input
                id={`task-edit-${task.id}-act`}
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-2 py-1.5 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
              />
            </div>
            <div>
              <label htmlFor={`task-edit-${task.id}-dur`} className={FORM_FIELD_LABEL_CLASS}>
                {t("projectDetail.durationDays")}
              </label>
              <input
                id={`task-edit-${task.id}-dur`}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                inputMode="numeric"
                className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-2 py-1.5 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
              />
            </div>
            <div>
              <label htmlFor={`task-edit-${task.id}-start`} className={FORM_FIELD_LABEL_CLASS}>
                {t("projectDetail.labelStartDate")}
              </label>
              <input
                id={`task-edit-${task.id}-start`}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-2 py-1.5 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
              />
            </div>
            <div>
              <label htmlFor={`task-edit-${task.id}-pri`} className={FORM_FIELD_LABEL_CLASS}>
                {t("projectDetail.labelPriority")}
              </label>
              <select
                id={`task-edit-${task.id}-pri`}
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-2 py-1.5 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
              >
                <option value="low">{t("task.priority.low")}</option>
                <option value="medium">{t("task.priority.medium")}</option>
                <option value="high">{t("task.priority.high")}</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`task-edit-${task.id}-phase`} className={FORM_FIELD_LABEL_CLASS}>
                {t("projectDetail.taskPhaseLabel")}
              </label>
              <select
                id={`task-edit-${task.id}-phase`}
                value={renovationPhase}
                onChange={(e) => setRenovationPhase(e.target.value as RenovationPhase)}
                className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-2 py-1.5 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
              >
                {RENOVATION_PHASE_ORDER.map((ph) => (
                  <option key={ph} value={ph}>
                    {t(`renovationPhase.${ph}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`task-edit-${task.id}-assign`} className={FORM_FIELD_LABEL_CLASS}>
                {t("projectDetail.labelAssignee")}
              </label>
              <select
                id={`task-edit-${task.id}-assign`}
                value={assignedRosterId}
                onChange={(e) => setAssignedRosterId(e.target.value)}
                className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-2 py-1.5 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
              >
                <option value="">{t("projectDetail.assigneeNone")}</option>
                {rosterOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <RoomIdsMultiSelect
            idPrefix={`task-edit-${task.id}`}
            rooms={projectRooms}
            selectedIds={selectedRoomIds}
            onChange={setSelectedRoomIds}
          />
          <div>
            <label htmlFor={`task-edit-${task.id}-depot`} className={FORM_FIELD_LABEL_CLASS}>
              {t("constructionDepot.taskSelectLabel")}
            </label>
            <select
              id={`task-edit-${task.id}-depot`}
              value={constructionDepotId}
              onChange={(e) => setConstructionDepotId(e.target.value)}
              className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-2 py-1.5 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            >
              <option value="">{t("constructionDepot.taskSelectNone")}</option>
              {depotOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`task-edit-${task.id}-desc`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.description")}
            </label>
            <textarea
              id={`task-edit-${task.id}-desc`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("projectDetail.descriptionOptional")}
              rows={2}
              className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-2 py-1.5 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={saveBusy}
              onClick={() => {
                void (async () => {
                  const parsed = taskFormFieldsSchema.safeParse({
                    title,
                    roomIds: selectedRoomIds,
                    estimatedCost,
                    actualCost,
                    durationDays,
                    description,
                    startDate,
                    status,
                    priority,
                    renovationPhase,
                    assignedRosterId,
                  });
                  if (!parsed.success) {
                    setSaveError(taskFormZodMessage(t, parsed.error));
                    return;
                  }
                  setSaveError(null);
                  setSaveBusy(true);
                  const d = parsed.data;
                  try {
                    const ok = await onUpdate({
                      id: task.id,
                      title: d.title,
                      status: d.status,
                      estimatedCost: d.estimatedCost,
                      actualCost: d.actualCost,
                      durationDays: d.durationDays,
                      priority: d.priority,
                      description: d.description.trim(),
                      startDate: d.startDate.trim() || null,
                      roomIds: d.roomIds,
                      assignedRosterId: d.assignedRosterId.trim() || null,
                      renovationPhase: d.renovationPhase,
                      constructionDepotId: constructionDepotId.trim() || null,
                    });
                    if (ok) {
                      setOpen(false);
                      setJustSaved(true);
                    } else {
                      setSaveError(t("projectDetail.taskSaveError"));
                    }
                  } finally {
                    setSaveBusy(false);
                  }
                })();
              }}
            >
              {saveBusy ? t("projectDetail.taskSaving") : t("projectDetail.saveTask")}
            </Button>
            <Button type="button" variant="secondary" onClick={onDelete}>
              {t("common.delete")}
            </Button>
          </div>
          {saveError ? (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              {saveError}
            </p>
          ) : null}

          <div className="rounded-md border border-renovation-border p-2 dark:border-renovation-border">
            <div className="text-xs font-medium text-foreground">{t("projectDetail.dependsOn")}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <select
                value={depPick}
                onChange={(e) => setDepPick(e.target.value)}
                className="max-w-full flex-1 rounded-md border border-renovation-border bg-renovation-elevated px-2 py-1 text-xs dark:border-renovation-border dark:bg-renovation-elevated"
              >
                <option value="">{t("projectDetail.selectPredecessor")}</option>
                {projectTaskOptions
                  .filter((t) => t.id !== task.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
              <Button
                type="button"
                className="text-xs"
                onClick={() => {
                  if (!depPick || depPick === task.id) return;
                  onAddDep(depPick);
                  setDepPick("");
                }}
              >
                {t("common.add")}
              </Button>
            </div>
            <ul className="mt-2 space-y-1 text-xs">
              {deps.map((d) => {
                const pred = projectTaskOptions.find((tk) => tk.id === d.dependsOnTaskId);
                if (!pred) return null;
                return (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span>{pred.title}</span>
                    <button type="button" className="text-red-600 dark:text-red-400" onClick={() => onRemoveDep(d.id)}>
                      {t("common.remove")}
                    </button>
                  </li>
                );
              })}
              {deps.length === 0 ? <li className="text-renovation-concrete">{t("projectDetail.noDependencies")}</li> : null}
            </ul>
          </div>

          <div className="rounded-md border border-renovation-border p-2 dark:border-renovation-border">
            <div className="text-xs font-medium text-foreground">{t("projectDetail.attachments")}</div>
            <input
              type="file"
              className="mt-2 block w-full text-xs"
              disabled={uploadBusy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                setUploadBusy(true);
                try {
                  await onUploadFile(f);
                } finally {
                  setUploadBusy(false);
                }
              }}
            />
            <ul className="mt-2 space-y-1 text-xs">
              {attachments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="truncate text-left text-foreground underline"
                    onClick={async () => {
                      const url = await signedUrl(a.filePath);
                      if (url) window.open(url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    {a.fileName}
                  </button>
                  <button type="button" className="text-red-600 dark:text-red-400" onClick={() => onRemoveAttachment(a.id)}>
                    {t("common.remove")}
                  </button>
                </li>
              ))}
              {attachments.length === 0 ? <li className="text-renovation-concrete">{t("projectDetail.noFilesYet")}</li> : null}
            </ul>
          </div>

          {linkedExpenses.length > 0 ? (
            <div className="rounded-md border border-renovation-border p-2 dark:border-renovation-border">
              <div className="text-xs font-medium text-foreground">
                {t("projectDetail.linkedExpensesTitle")}
              </div>
              <ul className="mt-2 space-y-1 text-xs">
                {linkedExpenses.map((ex) => (
                  <li key={ex.id} className="flex justify-between gap-2 text-foreground">
                    <span className="min-w-0 truncate">{ex.title}</span>
                    <span className="shrink-0 tabular-nums">{formatCost(ex.amount)}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/dashboard/projects/${projectId}/finances`}
                className="mt-2 inline-block text-xs font-medium text-renovation-steel underline dark:text-renovation-accent"
              >
                {t("projectDetail.linkedExpensesFinancesLink")}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function ProjectEditSection({
  project,
  updateProject,
}: {
  project: Project;
  updateProject: (input: {
    id: ID;
    name?: string;
    ownContribution?: number | null;
    constructionDepotTotal?: number | null;
    address?: string;
    expectedKeyHandover?: string | null;
    notes?: string;
  }) => void;
}) {
  const { t } = useI18n();
  const [editName, setEditName] = useState(project.name);
  const [editOwn, setEditOwn] = useState(
    project.ownContribution == null ? "" : String(project.ownContribution)
  );
  const [editDepot, setEditDepot] = useState(
    project.constructionDepotTotal == null ? "" : String(project.constructionDepotTotal)
  );
  const [editAddress, setEditAddress] = useState(project.address);
  const [editKeyDate, setEditKeyDate] = useState(project.expectedKeyHandover ?? "");
  const [editNotes, setEditNotes] = useState(project.notes);
  const [projectFormError, setProjectFormError] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-sm dark:border-renovation-border dark:bg-renovation-elevated">
      <h2 className="text-base font-semibold">{t("projectDetail.projectDetailsTitle")}</h2>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = projectUpdateFormSchema.safeParse({
            name: editName,
            ownContribution: editOwn,
            constructionDepotTotal: editDepot,
            address: editAddress,
            expectedKeyHandover: editKeyDate,
            notes: editNotes,
          });
          if (!parsed.success) {
            setProjectFormError(t("projectDetail.projectSaveInvalid"));
            return;
          }
          setProjectFormError(null);
          const d = parsed.data;
          updateProject({
            id: project.id,
            name: d.name,
            ownContribution: d.ownContribution,
            constructionDepotTotal: d.constructionDepotTotal,
            address: d.address,
            expectedKeyHandover: d.expectedKeyHandover.trim() || null,
            notes: d.notes,
          });
        }}
      >
        <div>
          <label htmlFor={`project-edit-${project.id}-name`} className={FORM_FIELD_LABEL_CLASS}>
            {t("projectDetail.labelProjectName")}
          </label>
          <input
            id={`project-edit-${project.id}-name`}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder={t("projectDetail.placeholderProjectName")}
            className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
          />
        </div>
        <div>
          <label htmlFor={`project-edit-${project.id}-own`} className={FORM_FIELD_LABEL_CLASS}>
            {t("budget.ownMoney")}
          </label>
          <input
            id={`project-edit-${project.id}-own`}
            value={editOwn}
            onChange={(e) => setEditOwn(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
          />
        </div>
        <div>
          <label htmlFor={`project-edit-${project.id}-depot`} className={FORM_FIELD_LABEL_CLASS}>
            {t("budget.depotTotal")}
          </label>
          <input
            id={`project-edit-${project.id}-depot`}
            value={editDepot}
            onChange={(e) => setEditDepot(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`project-edit-${project.id}-address`} className={FORM_FIELD_LABEL_CLASS}>
            {t("projectDetail.labelProjectAddress")}
          </label>
          <input
            id={`project-edit-${project.id}-address`}
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
            placeholder={t("projectDetail.placeholderAddress")}
            className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
          />
        </div>
        <div>
          <label htmlFor={`project-edit-${project.id}-key`} className={FORM_FIELD_LABEL_CLASS}>
            {t("projectDetail.labelExpectedKey")}
          </label>
          <input
            id={`project-edit-${project.id}-key`}
            type="date"
            value={editKeyDate}
            onChange={(e) => setEditKeyDate(e.target.value)}
            className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`project-edit-${project.id}-notes`} className={FORM_FIELD_LABEL_CLASS}>
            {t("projectDetail.labelNotes")}
          </label>
          <textarea
            id={`project-edit-${project.id}-notes`}
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
          />
        </div>
        <Button type="submit" className="sm:col-span-2 w-fit">
          {t("projectDetail.saveProject")}
        </Button>
      </form>
      {projectFormError ? (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {projectFormError}
        </div>
      ) : null}
    </section>
  );
}

function ProjectFinancesSummarySection({
  projectId,
  expenseTotal,
  expenseCount,
  documentCount,
}: {
  projectId: string;
  expenseTotal: number;
  expenseCount: number;
  documentCount: number;
}) {
  const { t } = useI18n();
  return (
    <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-sm dark:border-renovation-border dark:bg-renovation-elevated">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">{t("finances.summaryCardTitle")}</h2>
          <p className="mt-1 text-xs text-renovation-concrete">{t("finances.summaryCardBody")}</p>
          <p className="mt-2 text-sm tabular-nums text-foreground">
            {formatCost(expenseTotal)} · {t("finances.expenseCount", { count: expenseCount })} ·{" "}
            {t("finances.documentCount", { count: documentCount })}
          </p>
        </div>
        <Link
          href={`/dashboard/projects/${projectId}/finances`}
          className="inline-flex shrink-0 rounded-lg bg-renovation-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-renovation-steel"
        >
          {t("finances.goToFinances")}
        </Link>
      </div>
    </section>
  );
}

function RoomCard({
  room,
  tasks,
  projectRooms,
  projectTasks,
  depotOptions,
  rosterForProject,
  taskDependencies,
  taskAttachments,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onDeleteRoom,
  onAddDep,
  onRemoveDep,
  onUploadAttachment,
  onRemoveAttachment,
}: {
  room: Room;
  tasks: Task[];
  projectRooms: Room[];
  projectTasks: Task[];
  depotOptions: { id: ID; name: string }[];
  rosterForProject: TeamRosterEntry[];
  taskDependencies: TaskDependency[];
  taskAttachments: TaskAttachment[];
  onCreateTask: (input: {
    title: string;
    projectId?: ID;
    roomIds: ID[];
    status: TaskStatus;
    estimatedCost: number | null;
    actualCost: number;
    durationDays: number;
    priority: TaskPriority;
    description: string;
    startDate: string | null;
    assignedRosterId?: ID | null;
    renovationPhase?: RenovationPhase;
    constructionDepotId?: ID | null;
  }) => void;
  onUpdateTask: (input: {
    id: ID;
    title?: string;
    status?: TaskStatus;
    estimatedCost?: number | null;
    actualCost?: number;
    durationDays?: number;
    priority?: TaskPriority;
    description?: string;
    startDate?: string | null;
    roomIds?: ID[];
    sortOrder?: number;
    assignedRosterId?: ID | null;
    renovationPhase?: RenovationPhase;
    constructionDepotId?: ID | null;
  }) => Promise<boolean>;
  onDeleteTask: (id: ID) => void;
  onDeleteRoom: (roomId: ID) => void;
  onAddDep: (taskId: ID, dependsOnTaskId: ID) => void;
  onRemoveDep: (id: ID) => void;
  onUploadAttachment: (
    taskId: ID,
    file: File
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onRemoveAttachment: (id: ID) => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskPhase, setNewTaskPhase] = useState<RenovationPhase>(DEFAULT_RENOVATION_PHASE);
  const [newTaskRoomIds, setNewTaskRoomIds] = useState<ID[]>([room.id]);
  const [newTaskDepotId, setNewTaskDepotId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sortedTasks = useMemo(() => sortTasksForPlanning(tasks), [tasks]);
  const roomEstimatedTotal = useMemo(() => sumEstimatedCostsForRoom(tasks), [tasks]);
  const roomNameById = useMemo(() => new Map(projectRooms.map((r) => [r.id, r.name])), [projectRooms]);

  function confirmRemoveRoom() {
    const n = tasks.length;
    const detail =
      n > 0 ? (n === 1 ? t("projectDetail.removeRoomTasksOne") : t("projectDetail.removeRoomTasksMany", { count: n })) : "";
    if (
      typeof window !== "undefined" &&
      window.confirm(`${t("projectDetail.removeRoomConfirm", { name: room.name })}${detail}${t("projectDetail.removeRoomIrreversible")}`)
    ) {
      onDeleteRoom(room.id);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{room.name}</div>
          <div className="mt-1 text-xs text-renovation-concrete">
            {tasks.length === 1 ? t("projectDetail.taskCountOne") : t("projectDetail.taskCountMany", { count: tasks.length })}
            {" • "}
            {t("projectDetail.roomEstimatedTotal", { amount: formatCost(roomEstimatedTotal) })}
          </div>
        </div>
        <button
          type="button"
          onClick={confirmRemoveRoom}
          className="shrink-0 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
        >
          {t("projectDetail.removeRoom")}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {sortedTasks.length === 0 ? (
          <div className="rounded-md border border-dashed border-renovation-border bg-renovation-elevated p-3 text-xs text-renovation-concrete dark:border-renovation-border dark:bg-renovation-elevated">
            {t("projectDetail.noTasksInRoom")}
          </div>
        ) : (
          <ul className="space-y-2">
            {sortedTasks.map((task) => {
              const linkedRoomNames =
                task.roomIds
                  .map((rid) => roomNameById.get(rid))
                  .filter(Boolean)
                  .join(", ") || room.name;
              return (
              <TaskEditor
                key={task.id}
                task={task}
                projectId={room.projectId}
                linkedRoomNames={linkedRoomNames}
                projectRooms={projectRooms}
                depotOptions={depotOptions}
                projectTaskOptions={projectTasks}
                rosterOptions={rosterForProject}
                deps={taskDependencies.filter((d) => d.taskId === task.id)}
                attachments={taskAttachments.filter((a) => a.taskId === task.id)}
                onUpdate={onUpdateTask}
                onDelete={() => onDeleteTask(task.id)}
                onAddDep={(dependsOnTaskId) => onAddDep(task.id, dependsOnTaskId)}
                onRemoveDep={onRemoveDep}
                onUploadFile={async (file) => {
                  const r = await onUploadAttachment(task.id, file);
                  if (!r.ok) setError(r.error);
                }}
                onRemoveAttachment={onRemoveAttachment}
              />
            );
            })}
          </ul>
        )}
      </div>

      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = taskFormFieldsSchema.safeParse({
            title,
            roomIds: newTaskRoomIds,
            estimatedCost,
            actualCost,
            durationDays,
            description,
            startDate,
            status,
            priority,
            renovationPhase: newTaskPhase,
            assignedRosterId: newTaskAssignee,
          });
          if (!parsed.success) {
            setError(taskFormZodMessage(t, parsed.error));
            return;
          }
          const d = parsed.data;
          onCreateTask({
            title: d.title,
            projectId: room.projectId,
            roomIds: d.roomIds,
            status: d.status,
            estimatedCost: d.estimatedCost,
            actualCost: d.actualCost,
            durationDays: d.durationDays,
            priority: d.priority,
            description: d.description.trim(),
            startDate: d.startDate.trim() || null,
            assignedRosterId: d.assignedRosterId.trim() || null,
            renovationPhase: d.renovationPhase,
            constructionDepotId: newTaskDepotId.trim() || null,
          });
          setTitle("");
          setStatus("todo");
          setEstimatedCost("");
          setActualCost("");
          setDurationDays("");
          setPriority("medium");
          setDescription("");
          setStartDate("");
          setNewTaskAssignee("");
          setNewTaskPhase(DEFAULT_RENOVATION_PHASE);
          setNewTaskRoomIds([room.id]);
          setNewTaskDepotId("");
          setError(null);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`new-task-${room.id}-title`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.labelTaskTitle")}
            </label>
            <input
              id={`new-task-${room.id}-title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("projectDetail.taskTitlePlaceholder")}
              className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm outline-none focus:border-renovation-steel focus:ring-2 focus:ring-renovation-accent/40 dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
          <div>
            <label htmlFor={`new-task-${room.id}-status`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.labelTaskStatus")}
            </label>
            <select
              id={`new-task-${room.id}-status`}
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm outline-none focus:border-renovation-steel focus:ring-2 focus:ring-renovation-accent/40 dark:border-renovation-border dark:bg-renovation-elevated"
            >
              <option value="todo">{t("task.status.todo")}</option>
              <option value="doing">{t("task.status.doing")}</option>
              <option value="done">{t("task.status.done")}</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor={`new-task-${room.id}-est`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.estimatedCost")}
            </label>
            <input
              id={`new-task-${room.id}-est`}
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
          <div>
            <label htmlFor={`new-task-${room.id}-act`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.actualCost")}
            </label>
            <input
              id={`new-task-${room.id}-act`}
              value={actualCost}
              onChange={(e) => setActualCost(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
          <div>
            <label htmlFor={`new-task-${room.id}-dur`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.durationDays")}
            </label>
            <input
              id={`new-task-${room.id}-dur`}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              inputMode="numeric"
              className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
          <div>
            <label htmlFor={`new-task-${room.id}-start`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.labelStartDate")}
            </label>
            <input
              id={`new-task-${room.id}-start`}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
        </div>

        <RoomIdsMultiSelect
          idPrefix={`new-task-${room.id}`}
          rooms={projectRooms}
          selectedIds={newTaskRoomIds}
          onChange={setNewTaskRoomIds}
        />
        <div>
          <label htmlFor={`new-task-${room.id}-depot`} className={FORM_FIELD_LABEL_CLASS}>
            {t("constructionDepot.taskSelectLabel")}
          </label>
          <select
            id={`new-task-${room.id}-depot`}
            value={newTaskDepotId}
            onChange={(e) => setNewTaskDepotId(e.target.value)}
            className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
          >
            <option value="">{t("constructionDepot.taskSelectNone")}</option>
            {depotOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`new-task-${room.id}-desc`} className={FORM_FIELD_LABEL_CLASS}>
            {t("projectDetail.description")}
          </label>
          <textarea
            id={`new-task-${room.id}-desc`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("projectDetail.descriptionOptional")}
            rows={2}
            className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor={`new-task-${room.id}-pri`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.labelPriority")}
            </label>
            <select
              id={`new-task-${room.id}-pri`}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            >
              <option value="low">{t("task.priority.low")}</option>
              <option value="medium">{t("task.priority.medium")}</option>
              <option value="high">{t("task.priority.high")}</option>
            </select>
          </div>
          <div>
            <label htmlFor={`new-task-${room.id}-phase`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.taskPhaseLabel")}
            </label>
            <select
              id={`new-task-${room.id}-phase`}
              value={newTaskPhase}
              onChange={(e) => setNewTaskPhase(e.target.value as RenovationPhase)}
              className="w-full min-w-[10rem] rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            >
              {RENOVATION_PHASE_ORDER.map((ph) => (
                <option key={ph} value={ph}>
                  {t(`renovationPhase.${ph}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`new-task-${room.id}-assign`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.labelAssignee")}
            </label>
            <select
              id={`new-task-${room.id}-assign`}
              value={newTaskAssignee}
              onChange={(e) => setNewTaskAssignee(e.target.value)}
              className="w-full min-w-[10rem] rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            >
              <option value="">{t("projectDetail.assigneeNone")}</option>
              {rosterForProject.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.displayName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              {t("projectDetail.addTask")}
            </Button>
          </div>
        </div>

        {error ? <div className="text-xs text-red-600 dark:text-red-400">{error}</div> : null}
      </form>
    </Card>
  );
}

export default function ProjectDetailPageClient({ projectId }: { projectId: string }) {
  const {
    projects,
    rooms,
    tasks,
    projectExpenses,
    expenseDocuments,
    taskDependencies,
    taskAttachments,
    checklistItems,
    teamRoster,
    constructionDepots,
    createRoom,
    deleteRoom,
    createTask,
    updateTask,
    deleteTask,
    updateProject,
    addTaskDependency,
    removeTaskDependency,
    uploadTaskAttachment,
    removeTaskAttachment,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    addTeamRosterEntry,
    deleteTeamRosterEntry,
    isRenovationDataReady,
  } = useRenovation();

  const { t } = useI18n();

  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);
  const roomsForProject = useMemo(() => rooms.filter((r) => r.projectId === projectId), [rooms, projectId]);
  const projectTasks = useMemo(
    () => filterTasksForProject(tasks, rooms, projectId),
    [tasks, rooms, projectId]
  );
  const projectEstimatedTotal = useMemo(
    () => sumEstimatedCostsUnique(projectTasks),
    [projectTasks]
  );
  const depotOptions = useMemo(
    () =>
      constructionDepots
        .filter((d) => d.projectId === projectId)
        .map((d) => ({ id: d.id, name: d.name })),
    [constructionDepots, projectId]
  );
  const tasksByRoomId = useMemo(() => {
    const map = new Map<ID, Task[]>();
    for (const task of projectTasks) {
      for (const rid of task.roomIds) {
        if (!roomsForProject.some((r) => r.id === rid)) continue;
        const arr = map.get(rid) ?? [];
        arr.push(task);
        map.set(rid, arr);
      }
    }
    return map;
  }, [projectTasks, roomsForProject]);

  const timelineTasks = useMemo(() => sortTasksForPlanning(projectTasks), [projectTasks]);

  const checklistForProject = useMemo(
    () =>
      checklistItems
        .filter((c) => c.projectId === projectId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    [checklistItems, projectId]
  );

  const rosterForProject = useMemo(
    () =>
      teamRoster
        .filter((r) => r.projectId === projectId)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName)),
    [teamRoster, projectId]
  );

  const expensesForProject = useMemo(
    () => projectExpenses.filter((e) => e.projectId === projectId),
    [projectExpenses, projectId]
  );

  const financeExpenseTotal = useMemo(
    () => expensesForProject.reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0),
    [expensesForProject]
  );

  const financeDocumentCount = useMemo(
    () => expenseDocuments.filter((d) => d.projectId === projectId).length,
    [expenseDocuments, projectId]
  );

  const [roomName, setRoomName] = useState("");
  const [roomError, setRoomError] = useState<string | null>(null);

  const [checkTitle, setCheckTitle] = useState("");
  const [checkError, setCheckError] = useState<string | null>(null);
  const [rosterName, setRosterName] = useState("");
  const [rosterEmail, setRosterEmail] = useState("");
  const [rosterRole, setRosterRole] = useState("");
  const [rosterError, setRosterError] = useState<string | null>(null);

  if (!isRenovationDataReady) {
    return <ProjectDetailPageSkeleton />;
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("projectDetail.notFoundTitle")}</h1>
        <p className="text-sm text-renovation-concrete">{t("projectDetail.notFoundBody")}</p>
        <Link
          href="/dashboard/projects"
          className="inline-flex rounded-md bg-renovation-accent px-4 py-2 text-sm font-medium text-white hover:bg-renovation-steel"
        >
          {t("projectDetail.backToProjects")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6" data-tour="project-overview">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{project.name}</h1>
          <p className="mt-1 text-sm leading-relaxed text-renovation-concrete">{t("projectDetail.subtitle")}</p>
          <p className="mt-1 text-xs text-renovation-concrete">
            {t("projectDetail.budgetLine", { budget: formatCost(project.totalBudget) })}
            {" • "}
            {t("projectDetail.projectEstimatedTotal", { amount: formatCost(projectEstimatedTotal) })}
            {project.address ? ` • ${project.address}` : ""}
            {project.expectedKeyHandover
              ? ` • ${t("projectDetail.keyDate", { date: formatDisplayDate(project.expectedKeyHandover) })}`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/projects/${projectId}/planning`}
            className="inline-flex rounded-lg bg-renovation-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-renovation-steel"
          >
            {t("nav.planning")}
          </Link>
          <Link
            href="/dashboard/projects"
            className="inline-flex rounded-lg border border-renovation-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-renovation-muted"
          >
            {t("common.back")}
          </Link>
        </div>
      </div>

      <ProjectEditSection
        key={`${project.id}|${project.name}|${project.ownContribution}|${project.constructionDepotTotal}|${project.address}|${project.expectedKeyHandover ?? ""}|${project.notes}`}
        project={project}
        updateProject={updateProject}
      />

      <ProjectCollaborationSection projectId={projectId} />

      <ProjectFinancesSummarySection
        projectId={projectId}
        expenseTotal={financeExpenseTotal}
        expenseCount={expensesForProject.length}
        documentCount={financeDocumentCount}
      />

      <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-sm dark:border-renovation-border dark:bg-renovation-elevated">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("projectDetail.timelineTitle")}</h2>
            <p className="mt-1 text-xs text-renovation-concrete">
              {timelineTasks.length === 0
                ? t("projectDetail.timelineEmpty")
                : timelineTasks.length === 1
                  ? t("projectDetail.timelineSummaryOne")
                  : t("projectDetail.timelineSummaryMany", { count: timelineTasks.length })}
            </p>
          </div>
          <Link
            href={`/dashboard/projects/${projectId}/planning`}
            className="inline-flex shrink-0 rounded-lg bg-renovation-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-renovation-steel"
          >
            {t("projectDetail.openFullPlanning")}
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-sm dark:border-renovation-border dark:bg-renovation-elevated">
        <h2 className="text-base font-semibold">{t("projectDetail.checklistTitle")}</h2>
        <form
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = checklistItemTitleSchema.safeParse({ title: checkTitle });
            if (!parsed.success) {
              setCheckError(t("projectDetail.checklistItemRequired"));
              return;
            }
            setCheckError(null);
            addChecklistItem(projectId, parsed.data.title);
            setCheckTitle("");
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor={`checklist-${projectId}`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.labelChecklistItem")}
            </label>
            <input
              id={`checklist-${projectId}`}
              value={checkTitle}
              onChange={(e) => {
                setCheckTitle(e.target.value);
                setCheckError(null);
              }}
              placeholder={t("projectDetail.checklistPlaceholder")}
              className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
          <Button type="submit">{t("projectDetail.checklistAdd")}</Button>
        </form>
        {checkError ? <div className="mt-2 text-xs text-red-600 dark:text-red-400">{checkError}</div> : null}
        <ul className="mt-4 space-y-2">
          {checklistForProject.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-md border border-renovation-border px-3 py-2 dark:border-renovation-border">
              <input
                type="checkbox"
                checked={item.isDone}
                onChange={(e) => updateChecklistItem({ id: item.id, isDone: e.target.checked })}
              />
              <span className={item.isDone ? "flex-1 text-sm line-through text-renovation-concrete" : "flex-1 text-sm"}>{item.title}</span>
              <button
                type="button"
                className="text-xs text-red-600 dark:text-red-400"
                onClick={() => deleteChecklistItem(item.id)}
              >
                {t("projectDetail.checklistDelete")}
              </button>
            </li>
          ))}
          {checklistForProject.length === 0 ? <li className="text-sm text-renovation-concrete">{t("projectDetail.checklistEmpty")}</li> : null}
        </ul>
      </section>

      <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-sm dark:border-renovation-border dark:bg-renovation-elevated">
        <h2 className="text-base font-semibold">{t("projectDetail.rosterTitle")}</h2>
        <p className="mt-1 text-xs text-renovation-concrete">{t("projectDetail.rosterHint")}</p>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = rosterEntryFormSchema.safeParse({
              displayName: rosterName,
              email: rosterEmail,
              roleHint: rosterRole,
            });
            if (!parsed.success) {
              const path = parsed.error.issues[0]?.path[0];
              setRosterError(
                path === "email" ? t("projectDetail.rosterEmailInvalid") : t("projectDetail.rosterNameRequired")
              );
              return;
            }
            setRosterError(null);
            const d = parsed.data;
            addTeamRosterEntry(projectId, {
              displayName: d.displayName,
              email: d.email,
              roleHint: d.roleHint.trim(),
            });
            setRosterName("");
            setRosterEmail("");
            setRosterRole("");
          }}
        >
          <div>
            <label htmlFor={`roster-${projectId}-name`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.labelRosterName")}
            </label>
            <input
              id={`roster-${projectId}-name`}
              value={rosterName}
              onChange={(e) => {
                setRosterName(e.target.value);
                setRosterError(null);
              }}
              placeholder={t("projectDetail.rosterNamePlaceholder")}
              className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
          <div>
            <label htmlFor={`roster-${projectId}-email`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.labelRosterEmail")}
            </label>
            <input
              id={`roster-${projectId}-email`}
              value={rosterEmail}
              onChange={(e) => {
                setRosterEmail(e.target.value);
                setRosterError(null);
              }}
              placeholder={t("projectDetail.rosterEmailPlaceholder")}
              className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
          <div>
            <label htmlFor={`roster-${projectId}-role`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.labelRosterRole")}
            </label>
            <input
              id={`roster-${projectId}-role`}
              value={rosterRole}
              onChange={(e) => {
                setRosterRole(e.target.value);
                setRosterError(null);
              }}
              placeholder={t("projectDetail.rosterRolePlaceholder")}
              className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
          <Button type="submit" className="sm:col-span-3 w-fit">
            {t("projectDetail.rosterAddPerson")}
          </Button>
        </form>
        {rosterError ? <div className="mt-2 text-xs text-red-600 dark:text-red-400">{rosterError}</div> : null}
        <ul className="mt-4 space-y-2 text-sm">
          {rosterForProject.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-renovation-border px-3 py-2 dark:border-renovation-border">
              <div>
                <div className="font-medium">{r.displayName}</div>
                <div className="text-xs text-renovation-concrete">
                  {r.email || t("common.emDash")} {r.roleHint ? `• ${r.roleHint}` : ""}
                </div>
              </div>
              <button type="button" className="text-xs text-red-600 dark:text-red-400" onClick={() => deleteTeamRosterEntry(r.id)}>
                {t("common.remove")}
              </button>
            </li>
          ))}
          {rosterForProject.length === 0 ? <li className="text-renovation-concrete">{t("projectDetail.rosterEmpty")}</li> : null}
        </ul>
      </section>

      <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-sm dark:border-renovation-border dark:bg-renovation-elevated">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t("projectDetail.roomsTitle")}</h2>
            <div className="mt-1 text-xs text-renovation-concrete">
              {roomsForProject.length === 1
                ? t("projectDetail.roomsCountOne")
                : t("projectDetail.roomsCountMany", { count: roomsForProject.length })}
            </div>
          </div>
        </div>

        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = roomNameFormSchema.safeParse({ name: roomName });
            if (!parsed.success) {
              setRoomError(t("projectDetail.roomErrorName"));
              return;
            }
            createRoom({ name: parsed.data.name, projectId });
            setRoomName("");
            setRoomError(null);
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor={`room-add-${projectId}`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.labelRoomName")}
            </label>
            <input
              id={`room-add-${projectId}`}
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder={t("projectDetail.roomPlaceholder")}
              className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm outline-none focus:border-renovation-steel focus:ring-2 focus:ring-renovation-accent/40 dark:border-renovation-border dark:bg-renovation-elevated"
            />
            {roomError ? <div className="mt-2 text-xs text-red-600 dark:text-red-400">{roomError}</div> : null}
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            {t("projectDetail.addRoom")}
          </Button>
        </form>
      </section>


      <section>
        {roomsForProject.length === 0 ? (
          <div className="rounded-xl border border-dashed border-renovation-border bg-renovation-elevated p-6 text-sm text-renovation-concrete dark:border-renovation-border dark:bg-renovation-elevated">
            {t("projectDetail.roomsEmpty")}
          </div>
        ) : (
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {roomsForProject.map((room) => {
              const roomTasks = tasksByRoomId.get(room.id) ?? [];
              return (
                <RoomCard
                  key={room.id}
                  room={room}
                  tasks={roomTasks}
                  projectRooms={roomsForProject}
                  projectTasks={projectTasks}
                  depotOptions={depotOptions}
                  rosterForProject={rosterForProject}
                  taskDependencies={taskDependencies}
                  taskAttachments={taskAttachments}
                  onCreateTask={(input) => createTask(input)}
                  onUpdateTask={updateTask}
                  onDeleteTask={deleteTask}
                  onDeleteRoom={deleteRoom}
                  onAddDep={addTaskDependency}
                  onRemoveDep={removeTaskDependency}
                  onUploadAttachment={uploadTaskAttachment}
                  onRemoveAttachment={removeTaskAttachment}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
