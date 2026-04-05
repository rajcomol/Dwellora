"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import { expenseLineFormSchema } from "@/lib/validation/schemas";
import type { ExpenseDocument, ExpenseDocumentType, ID, ProjectExpense, Task } from "@/lib/renovation/types";
import { formatCurrency } from "@/lib/format/currency";
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import { EXPENSE_DOCUMENTS_BUCKET } from "@/lib/finances/constants";
import { ProjectDetailPageSkeleton } from "@/components/ui/Skeleton";
import type { TranslateFn } from "@/i18n/create-translator";
import type { ZodError } from "zod";
import { supabase } from "@/lib/supabase/client";

const FORM_FIELD_LABEL_CLASS = "mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400";

function expenseFormZodMessage(t: TranslateFn, err: ZodError): string {
  const path = err.issues[0]?.path[0];
  if (path === "title") return t("projectDetail.expenseTitleRequired");
  if (path === "amount") return t("projectDetail.expenseAmountInvalid");
  return t("validation.generic");
}

function docTypeLabel(t: TranslateFn, dt: ExpenseDocumentType) {
  if (dt === "receipt") return t("finances.documentTypeReceipt");
  if (dt === "invoice") return t("finances.documentTypeInvoice");
  return t("finances.documentTypeOther");
}

function taskLabelForExpense(expense: ProjectExpense, tasks: Task[], rooms: { id: string; name: string }[]) {
  if (!expense.taskId) return null;
  const task = tasks.find((tk) => tk.id === expense.taskId);
  if (!task) return null;
  const room = rooms.find((r) => r.id === task.roomId);
  return room ? `${task.title} (${room.name})` : task.title;
}

function ExpenseDocumentsBlock({
  documents,
  onRemove,
}: {
  documents: { id: ID; fileName: string; filePath: string; documentType: ExpenseDocumentType }[];
  onRemove: (id: ID) => void;
}) {
  const { t } = useI18n();

  async function openFile(path: string) {
    const { data, error } = await supabase.storage.from(EXPENSE_DOCUMENTS_BUCKET).createSignedUrl(path, 600);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-3 rounded-md border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{t("finances.attachmentsHeading")}</div>
      {documents.length === 0 ? (
        <p className="mt-1 text-xs text-zinc-500">{t("finances.noAttachmentsYet")}</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-xs">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="min-w-0 truncate text-left text-zinc-800 underline dark:text-zinc-200"
                onClick={() => void openFile(d.filePath)}
              >
                <span className="text-zinc-500">[{docTypeLabel(t, d.documentType)}]</span> {d.fileName}
              </button>
              <button
                type="button"
                className="shrink-0 text-red-600 dark:text-red-400"
                onClick={() => {
                  if (typeof window !== "undefined" && window.confirm(t("finances.confirmRemoveDocument"))) {
                    onRemove(d.id);
                  }
                }}
              >
                {t("common.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ProjectFinancesPageClient({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const {
    projects,
    rooms,
    tasks,
    projectExpenses,
    expenseDocuments,
    isRenovationDataReady,
    createProjectExpense,
    updateProjectExpense,
    deleteProjectExpense,
    uploadExpenseDocument,
    removeExpenseDocument,
  } = useRenovation();

  const project = projects.find((p) => p.id === projectId);
  const projectRooms = useMemo(() => rooms.filter((r) => r.projectId === projectId), [rooms, projectId]);
  const roomIdSet = useMemo(() => new Set(projectRooms.map((r) => r.id)), [projectRooms]);
  const projectTasks = useMemo(() => tasks.filter((tk) => roomIdSet.has(tk.roomId)), [tasks, roomIdSet]);

  const expenses = useMemo(
    () => projectExpenses.filter((e) => e.projectId === projectId),
    [projectExpenses, projectId]
  );
  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [expenses]
  );

  const docsByExpense = useMemo(() => {
    const m = new Map<ID, typeof expenseDocuments>();
    for (const d of expenseDocuments) {
      if (d.projectId !== projectId) continue;
      const arr = m.get(d.expenseId) ?? [];
      arr.push(d);
      m.set(d.expenseId, arr);
    }
    return m;
  }, [expenseDocuments, projectId]);

  const totalAmount = useMemo(() => expenses.reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0), [expenses]);
  const docCount = useMemo(
    () => expenseDocuments.filter((d) => d.projectId === projectId).length,
    [expenseDocuments, projectId]
  );

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [spentOn, setSpentOn] = useState("");
  const [notes, setNotes] = useState("");
  const [taskId, setTaskId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (!isRenovationDataReady) {
    return <ProjectDetailPageSkeleton />;
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">{t("projectDetail.notFoundTitle")}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("projectDetail.notFoundBody")}</p>
        <Link
          href="/dashboard/projects"
          className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {t("projectDetail.backToProjects")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{t("finances.title")}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("finances.subtitle")}</p>
        <p className="mt-2 text-sm tabular-nums text-zinc-800 dark:text-zinc-200">
          {t("finances.totalRecorded")}: {formatCurrency(totalAmount)} · {t("finances.expenseCount", { count: expenses.length })} ·{" "}
          {t("finances.documentCount", { count: docCount })}
        </p>
      </div>

      <Card className="p-5">
        <h2 className="text-base font-semibold">{t("finances.newExpense")}</h2>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = expenseLineFormSchema.safeParse({ title, amount, spentOn, notes, taskId });
            if (!parsed.success) {
              setFormError(expenseFormZodMessage(t, parsed.error));
              return;
            }
            const d = parsed.data;
            createProjectExpense({
              projectId,
              title: d.title,
              amount: d.amount,
              spentOn: d.spentOn.trim() || null,
              notes: d.notes.trim(),
              taskId: d.taskId.trim() || null,
            });
            setTitle("");
            setAmount("");
            setSpentOn("");
            setNotes("");
            setTaskId("");
            setFormError(null);
          }}
        >
          <div className="sm:col-span-2">
            <label htmlFor={`fin-new-title-${projectId}`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.labelExpenseTitle")}
            </label>
            <input
              id={`fin-new-title-${projectId}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label htmlFor={`fin-new-amount-${projectId}`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.expenseAmount")}
            </label>
            <input
              id={`fin-new-amount-${projectId}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label htmlFor={`fin-new-date-${projectId}`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.expenseDate")}
            </label>
            <input
              id={`fin-new-date-${projectId}`}
              type="date"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`fin-new-task-${projectId}`} className={FORM_FIELD_LABEL_CLASS}>
              {t("finances.labelTaskOptional")}
            </label>
            <select
              id={`fin-new-task-${projectId}`}
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">{t("finances.noTask")}</option>
              {projectTasks.map((tk) => {
                const room = projectRooms.find((r) => r.id === tk.roomId);
                return (
                  <option key={tk.id} value={tk.id}>
                    {tk.title}
                    {room ? ` — ${room.name}` : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`fin-new-notes-${projectId}`} className={FORM_FIELD_LABEL_CLASS}>
              {t("projectDetail.expenseNotes")}
            </label>
            <textarea
              id={`fin-new-notes-${projectId}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <Button type="submit" className="w-fit sm:col-span-2">
            {t("projectDetail.expenseAdd")}
          </Button>
        </form>
        {formError ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{formError}</p> : null}
      </Card>

      <section>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{t("finances.expenseListTitle")}</h2>
        {sortedExpenses.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">{t("projectDetail.expenseEmpty")}</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {sortedExpenses.map((ex) => (
              <ExpenseRow
                key={ex.id}
                expense={ex}
                projectTasks={projectTasks}
                projectRooms={projectRooms}
                documents={docsByExpense.get(ex.id) ?? []}
                onUpdate={updateProjectExpense}
                onDelete={() => {
                  if (typeof window !== "undefined" && window.confirm(t("finances.confirmDeleteExpense"))) {
                    deleteProjectExpense(ex.id);
                  }
                }}
                onUpload={uploadExpenseDocument}
                onRemoveDocument={removeExpenseDocument}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ExpenseRow({
  expense,
  projectTasks,
  projectRooms,
  documents,
  onUpdate,
  onDelete,
  onUpload,
  onRemoveDocument,
}: {
  expense: ProjectExpense;
  projectTasks: Task[];
  projectRooms: { id: string; name: string }[];
  documents: ExpenseDocument[];
  onUpdate: (input: {
    id: ID;
    title?: string;
    amount?: number;
    spentOn?: string | null;
    notes?: string;
    taskId?: ID | null;
  }) => void;
  onDelete: () => void;
  onUpload: (
    expenseId: ID,
    file: File,
    documentType: ExpenseDocumentType
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onRemoveDocument: (id: ID) => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(expense.title);
  const [amount, setAmount] = useState(String(expense.amount));
  const [spentOn, setSpentOn] = useState(expense.spentOn ?? "");
  const [notes, setNotes] = useState(expense.notes);
  const [taskId, setTaskId] = useState(expense.taskId ?? "");
  const [editError, setEditError] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<ExpenseDocumentType>("receipt");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const taskSummary = taskLabelForExpense(expense, projectTasks, projectRooms);

  if (editing) {
    return (
      <li className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={FORM_FIELD_LABEL_CLASS}>{t("projectDetail.labelExpenseTitle")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label className={FORM_FIELD_LABEL_CLASS}>{t("projectDetail.expenseAmount")}</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label className={FORM_FIELD_LABEL_CLASS}>{t("projectDetail.expenseDate")}</label>
            <input
              type="date"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={FORM_FIELD_LABEL_CLASS}>{t("finances.labelTaskOptional")}</label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option value="">{t("finances.noTask")}</option>
              {projectTasks.map((tk) => {
                const room = projectRooms.find((r) => r.id === tk.roomId);
                return (
                  <option key={tk.id} value={tk.id}>
                    {tk.title}
                    {room ? ` — ${room.name}` : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={FORM_FIELD_LABEL_CLASS}>{t("projectDetail.expenseNotes")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            className="text-xs"
            onClick={() => {
              const parsed = expenseLineFormSchema.safeParse({ title, amount, spentOn, notes, taskId });
              if (!parsed.success) {
                setEditError(expenseFormZodMessage(t, parsed.error));
                return;
              }
              setEditError(null);
              const d = parsed.data;
              onUpdate({
                id: expense.id,
                title: d.title,
                amount: d.amount,
                spentOn: d.spentOn.trim() || null,
                notes: d.notes.trim(),
                taskId: d.taskId.trim() || null,
              });
              setEditing(false);
            }}
          >
            {t("projectDetail.expenseSave")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="text-xs"
            onClick={() => {
              setTitle(expense.title);
              setAmount(String(expense.amount));
              setSpentOn(expense.spentOn ?? "");
              setNotes(expense.notes);
              setTaskId(expense.taskId ?? "");
              setEditError(null);
              setEditing(false);
            }}
          >
            {t("common.close")}
          </Button>
        </div>
        {editError ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{editError}</p> : null}
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-zinc-900 dark:text-zinc-50">{expense.title}</div>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {formatCurrency(expense.amount)}
            {expense.spentOn ? ` • ${formatDisplayDate(expense.spentOn)}` : ""}
            {taskSummary ? ` • ${t("finances.linkedTask")}: ${taskSummary}` : ""}
          </div>
          {expense.notes ? <div className="mt-1 text-xs text-zinc-500">{expense.notes}</div> : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="text-xs font-medium text-zinc-700 underline dark:text-zinc-300"
            onClick={() => {
              setTitle(expense.title);
              setAmount(String(expense.amount));
              setSpentOn(expense.spentOn ?? "");
              setNotes(expense.notes);
              setTaskId(expense.taskId ?? "");
              setEditError(null);
              setEditing(true);
            }}
          >
            {t("common.edit")}
          </button>
          <button type="button" className="text-xs font-medium text-red-600 dark:text-red-400" onClick={onDelete}>
            {t("common.delete")}
          </button>
        </div>
      </div>

      <ExpenseDocumentsBlock
        documents={documents.map((d) => ({
          id: d.id,
          fileName: d.fileName,
          filePath: d.filePath,
          documentType: d.documentType,
        }))}
        onRemove={onRemoveDocument}
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className={FORM_FIELD_LABEL_CLASS}>{t("finances.uploadTypeLabel")}</label>
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value as ExpenseDocumentType)}
            className="w-full max-w-xs rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="receipt">{t("finances.documentTypeReceipt")}</option>
            <option value="invoice">{t("finances.documentTypeInvoice")}</option>
            <option value="other">{t("finances.documentTypeOther")}</option>
          </select>
        </div>
        <div>
          <label className={FORM_FIELD_LABEL_CLASS}>{t("finances.uploadLabel")}</label>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
            disabled={uploadBusy}
            className="block w-full text-xs"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setUploadBusy(true);
              setUploadErr(null);
              try {
                const r = await onUpload(expense.id, f, uploadType);
                if (!r.ok) setUploadErr(r.error);
              } finally {
                setUploadBusy(false);
              }
            }}
          />
        </div>
      </div>
      {uploadErr ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{uploadErr}</p> : null}
      <p className="mt-1 text-[11px] text-zinc-500">{t("finances.uploadHint")}</p>
    </li>
  );
}
