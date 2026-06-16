"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { RENOVATION_PHASE_ORDER } from "@/lib/renovation/phases";
import { isSharedTask, otherRoomNamesForTask } from "@/lib/renovation/sharedTask";
import type { ID, RenovationPhase, Task, TaskPriority, TaskStatus, TeamRosterEntry } from "@/lib/renovation/types";
import { roomTaskFormSchema } from "@/lib/validation/schemas";
import type { ZodError } from "zod";

const FORM_FIELD_LABEL_CLASS = "mb-1 block text-xs font-medium text-renovation-concrete";

type ProjectRoomOption = { id: ID; name: string };

type TranslateFn = ReturnType<typeof useI18n>["t"];

function roomTaskFormZodMessage(t: TranslateFn, err: ZodError): string {
  const issue = err.issues[0];
  if (!issue) return t("validation.generic");
  if (issue.path[0] === "title") return t("validation.required");
  if (issue.path[0] === "roomIds") return t("projectDetail.taskRoomsRequired");
  if (issue.path[0] === "durationDays") return t("validation.positiveInteger");
  return t("validation.generic");
}

type TaskFormValues = {
  title: string;
  roomIds: ID[];
  durationDays: number;
  priority: TaskPriority;
  renovationPhase: RenovationPhase;
  status: TaskStatus;
  assignedRosterId: ID | null;
  description: string;
};

type CreateProps = {
  mode: "create";
  roomId: ID;
  projectId: ID;
  projectRooms: ProjectRoomOption[];
  rosterOptions: TeamRosterEntry[];
  onSubmit: (values: TaskFormValues) => Promise<boolean>;
};

type EditProps = {
  mode: "edit";
  task: Task;
  currentRoomId: ID;
  projectRooms: ProjectRoomOption[];
  rosterOptions: TeamRosterEntry[];
  onSubmit: (values: TaskFormValues & { id: ID }) => Promise<boolean>;
  onDelete: () => void;
};

type Props = CreateProps | EditProps;

export default function RoomTaskForm(props: Props) {
  const { t } = useI18n();
  const isEdit = props.mode === "edit";
  const task = isEdit ? props.task : null;
  const defaultRoomIds = isEdit ? task!.roomIds : [props.roomId];

  const [title, setTitle] = useState(task?.title ?? "");
  const [roomIds, setRoomIds] = useState<ID[]>(defaultRoomIds);
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [durationDays, setDurationDays] = useState(String(task?.durationDays ?? 1));
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [description, setDescription] = useState(task?.description ?? "");
  const [renovationPhase, setRenovationPhase] = useState<RenovationPhase>(
    task?.renovationPhase ?? RENOVATION_PHASE_ORDER[0]
  );
  const [assignedRosterId, setAssignedRosterId] = useState(task?.assignedRosterId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(!isEdit);

  const idPrefix = isEdit ? `room-task-edit-${task!.id}` : `room-task-new-${props.roomId}`;

  const roomNameById = useMemo(
    () => new Map(props.projectRooms.map((room) => [room.id, room.name])),
    [props.projectRooms]
  );

  useEffect(() => {
    if (!isEdit || !task) return;
    setTitle(task.title);
    setRoomIds(task.roomIds);
    setStatus(task.status);
    setDurationDays(String(task.durationDays));
    setPriority(task.priority);
    setDescription(task.description);
    setRenovationPhase(task.renovationPhase);
    setAssignedRosterId(task.assignedRosterId ?? "");
  }, [
    isEdit,
    task?.id,
    task?.title,
    task?.roomIds,
    task?.status,
    task?.durationDays,
    task?.priority,
    task?.description,
    task?.renovationPhase,
    task?.assignedRosterId,
  ]);

  const rosterOptions = props.rosterOptions;

  const assigneeLabel = useMemo(() => {
    if (!isEdit || !task) return null;
    return task.assignedRosterId != null
      ? (rosterOptions.find((r) => r.id === task.assignedRosterId)?.displayName ?? t("projectDetail.assigneeUnknown"))
      : t("projectDetail.assigneeUnassigned");
  }, [isEdit, task, rosterOptions, t]);

  const sharedBadge = useMemo(() => {
    if (!isEdit || !task || !isSharedTask(task)) return null;
    const others = otherRoomNamesForTask(task, props.currentRoomId, roomNameById);
    if (others.length === 0) return null;
    return t("projectDetail.sharedTaskBadge", { rooms: others.join(", ") });
  }, [isEdit, task, props, roomNameById, t]);

  function toggleRoomId(roomId: ID, checked: boolean) {
    setRoomIds((prev) => {
      if (checked) return prev.includes(roomId) ? prev : [...prev, roomId];
      return prev.filter((id) => id !== roomId);
    });
  }

  async function handleSave() {
    const parsed = roomTaskFormSchema.safeParse({
      title,
      roomIds,
      durationDays,
      description,
      status,
      priority,
      renovationPhase,
      assignedRosterId,
    });
    if (!parsed.success) {
      setError(roomTaskFormZodMessage(t, parsed.error));
      return;
    }
    setError(null);
    setBusy(true);
    const d = parsed.data;
    const payload: TaskFormValues = {
      title: d.title,
      roomIds: d.roomIds,
      durationDays: d.durationDays,
      priority: d.priority,
      renovationPhase: d.renovationPhase,
      status: d.status,
      assignedRosterId: d.assignedRosterId.trim() || null,
      description: d.description.trim(),
    };
    try {
      const ok =
        props.mode === "create"
          ? await props.onSubmit(payload)
          : await props.onSubmit({ id: props.task.id, ...payload });
      if (ok && props.mode === "create") {
        setTitle("");
        setRoomIds([props.roomId]);
        setStatus("todo");
        setDurationDays("1");
        setPriority("medium");
        setDescription("");
        setRenovationPhase(RENOVATION_PHASE_ORDER[0]);
        setAssignedRosterId("");
      }
      if (ok && props.mode === "edit") {
        setOpen(false);
      }
      if (!ok) {
        setError(t("projectDetail.taskSaveError"));
      }
    } finally {
      setBusy(false);
    }
  }

  if (isEdit && task) {
    return (
      <li
        className="rounded-lg border border-renovation-border px-4 py-3 dark:border-renovation-border"
        data-testid="room-task-item"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-medium">{task.title}</div>
            {sharedBadge ? (
              <div
                className="mt-0.5 text-xs font-medium text-renovation-steel"
                data-testid="shared-task-badge"
              >
                {sharedBadge}
              </div>
            ) : null}
            <div className="text-xs text-renovation-concrete">
              {t(`task.status.${task.status}`)} • {task.durationDays}d • {t(`renovationPhase.${task.renovationPhase}`)}
              {" • "}
              {assigneeLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-xs font-medium text-renovation-steel underline"
          >
            {open ? t("common.close") : t("common.edit")}
          </button>
        </div>

        {open ? (
          <div className="mt-3 space-y-3 border-t border-renovation-border pt-3 dark:border-renovation-border">
            <TaskFields
              idPrefix={idPrefix}
              title={title}
              setTitle={setTitle}
              roomIds={roomIds}
              toggleRoomId={toggleRoomId}
              projectRooms={props.projectRooms}
              status={status}
              setStatus={setStatus}
              durationDays={durationDays}
              setDurationDays={setDurationDays}
              priority={priority}
              setPriority={setPriority}
              renovationPhase={renovationPhase}
              setRenovationPhase={setRenovationPhase}
              assignedRosterId={assignedRosterId}
              setAssignedRosterId={setAssignedRosterId}
              description={description}
              setDescription={setDescription}
              rosterOptions={rosterOptions}
            />
            {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={busy} onClick={() => void handleSave()}>
                {t("common.save")}
              </Button>
              <button
                type="button"
                className="text-xs text-red-600 hover:underline dark:text-red-400"
                onClick={props.onDelete}
              >
                {t("common.delete")}
              </button>
            </div>
          </div>
        ) : null}
      </li>
    );
  }

  return (
    <form
      className="space-y-3 rounded-xl border border-renovation-border bg-renovation-elevated p-4 dark:border-renovation-border dark:bg-renovation-elevated"
      data-testid="room-task-form"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSave();
      }}
    >
      <h2 className="text-sm font-semibold">{t("projectDetail.addTask")}</h2>
      <TaskFields
        idPrefix={idPrefix}
        title={title}
        setTitle={setTitle}
        roomIds={roomIds}
        toggleRoomId={toggleRoomId}
        projectRooms={props.projectRooms}
        status={status}
        setStatus={setStatus}
        durationDays={durationDays}
        setDurationDays={setDurationDays}
        priority={priority}
        setPriority={setPriority}
        renovationPhase={renovationPhase}
        setRenovationPhase={setRenovationPhase}
        assignedRosterId={assignedRosterId}
        setAssignedRosterId={setAssignedRosterId}
        description={description}
        setDescription={setDescription}
        rosterOptions={rosterOptions}
      />
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      <Button type="submit" disabled={busy}>
        {t("common.save")}
      </Button>
    </form>
  );
}

function TaskFields({
  idPrefix,
  title,
  setTitle,
  roomIds,
  toggleRoomId,
  projectRooms,
  status,
  setStatus,
  durationDays,
  setDurationDays,
  priority,
  setPriority,
  renovationPhase,
  setRenovationPhase,
  assignedRosterId,
  setAssignedRosterId,
  description,
  setDescription,
  rosterOptions,
}: {
  idPrefix: string;
  title: string;
  setTitle: (v: string) => void;
  roomIds: ID[];
  toggleRoomId: (roomId: ID, checked: boolean) => void;
  projectRooms: ProjectRoomOption[];
  status: TaskStatus;
  setStatus: (v: TaskStatus) => void;
  durationDays: string;
  setDurationDays: (v: string) => void;
  priority: TaskPriority;
  setPriority: (v: TaskPriority) => void;
  renovationPhase: RenovationPhase;
  setRenovationPhase: (v: RenovationPhase) => void;
  assignedRosterId: string;
  setAssignedRosterId: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  rosterOptions: TeamRosterEntry[];
}) {
  const { t } = useI18n();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-title`} className={FORM_FIELD_LABEL_CLASS}>
          {t("projectDetail.labelTaskTitle")}
        </label>
        <input
          id={`${idPrefix}-title`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("projectDetail.taskTitlePlaceholder")}
          className="w-full rounded-lg border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
        />
      </div>
      <div className="sm:col-span-2">
        <fieldset data-testid="task-room-select">
          <legend className={FORM_FIELD_LABEL_CLASS}>{t("projectDetail.labelTaskRooms")}</legend>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
            {projectRooms.map((room) => (
              <label
                key={room.id}
                htmlFor={`${idPrefix}-room-${room.id}`}
                className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground"
              >
                <input
                  id={`${idPrefix}-room-${room.id}`}
                  type="checkbox"
                  checked={roomIds.includes(room.id)}
                  onChange={(e) => toggleRoomId(room.id, e.target.checked)}
                  className="h-4 w-4 rounded border-renovation-border text-renovation-accent focus:ring-renovation-accent"
                />
                {room.name}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-dur`} className={FORM_FIELD_LABEL_CLASS}>
          {t("projectDetail.durationDays")}
        </label>
        <input
          id={`${idPrefix}-dur`}
          type="number"
          min={1}
          value={durationDays}
          onChange={(e) => setDurationDays(e.target.value)}
          className="w-full rounded-lg border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-pri`} className={FORM_FIELD_LABEL_CLASS}>
          {t("projectDetail.labelPriority")}
        </label>
        <select
          id={`${idPrefix}-pri`}
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          className="w-full rounded-lg border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
        >
          <option value="low">{t("task.priority.low")}</option>
          <option value="medium">{t("task.priority.medium")}</option>
          <option value="high">{t("task.priority.high")}</option>
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-phase`} className={FORM_FIELD_LABEL_CLASS}>
          {t("projectDetail.taskPhaseLabel")}
        </label>
        <select
          id={`${idPrefix}-phase`}
          value={renovationPhase}
          onChange={(e) => setRenovationPhase(e.target.value as RenovationPhase)}
          className="w-full rounded-lg border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
        >
          {RENOVATION_PHASE_ORDER.map((ph) => (
            <option key={ph} value={ph}>
              {t(`renovationPhase.${ph}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-status`} className={FORM_FIELD_LABEL_CLASS}>
          {t("projectDetail.labelTaskStatus")}
        </label>
        <select
          id={`${idPrefix}-status`}
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus)}
          className="w-full rounded-lg border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
        >
          <option value="todo">{t("task.status.todo")}</option>
          <option value="doing">{t("task.status.doing")}</option>
          <option value="done">{t("task.status.done")}</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-assign`} className={FORM_FIELD_LABEL_CLASS}>
          {t("projectDetail.labelAssignee")}
        </label>
        <select
          id={`${idPrefix}-assign`}
          value={assignedRosterId}
          onChange={(e) => setAssignedRosterId(e.target.value)}
          className="w-full rounded-lg border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
        >
          <option value="">{t("projectDetail.assigneeNone")}</option>
          {rosterOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.displayName}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-desc`} className={FORM_FIELD_LABEL_CLASS}>
          {t("projectDetail.description")}
        </label>
        <textarea
          id={`${idPrefix}-desc`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("projectDetail.descriptionOptional")}
          rows={2}
          className="w-full rounded-lg border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
        />
      </div>
    </div>
  );
}
