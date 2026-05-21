"use client";

import Link from "next/link";
import { appendProjectQuery } from "@/components/layout/tab-nav-config";
import { useI18n } from "@/i18n/provider";
import { formatCurrency } from "@/lib/format/currency";
import { formatTaskDateRange, taskEndDate } from "@/lib/renovation/taskDates";
import type { Task } from "@/lib/renovation/types";

type Props = {
  task: Task | null;
  roomLabel: string;
  projectId: string;
  onClose: () => void;
};

export default function TaskDetailPanel({ task, roomLabel, projectId, onClose }: Props) {
  const { t } = useI18n();

  if (!task) return null;

  const end = taskEndDate(task);
  const editHref = appendProjectQuery(`/dashboard/projects/${projectId}/overview`, projectId);

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/40"
        aria-label={t("planning.taskPanel.close")}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-labelledby="task-detail-title"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-renovation-border bg-renovation-elevated shadow-xl dark:border-renovation-border dark:bg-renovation-elevated"
      >
        <div className="flex items-center justify-between border-b border-renovation-border px-4 py-3 dark:border-renovation-border">
          <h2 id="task-detail-title" className="text-lg font-semibold">
            {t("planning.taskPanel.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-renovation-concrete hover:bg-renovation-muted dark:hover:bg-zinc-900"
          >
            {t("planning.taskPanel.close")}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-renovation-concrete">{t("planning.gantt.taskColumn")}</p>
            <p className="mt-1 text-base font-medium">{task.title}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-renovation-concrete">Ruimte</p>
            <p className="mt-1 text-sm">{roomLabel}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-renovation-concrete">Status</p>
            <p className="mt-1 text-sm">{t(`task.status.${task.status}`)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-renovation-concrete">Periode</p>
            <p className="mt-1 text-sm">{formatTaskDateRange(task.startDate, end, t)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-renovation-concrete">Geschatte kosten</p>
            <p className="mt-1 text-sm tabular-nums">
              {task.estimatedCost != null ? formatCurrency(task.estimatedCost) : t("common.emDash")}
            </p>
          </div>
          {task.description ? (
            <div>
              <p className="text-xs font-medium text-renovation-concrete">Beschrijving</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          ) : null}
        </div>
        <div className="border-t border-renovation-border p-4 dark:border-renovation-border">
          <Link
            href={editHref}
            className="text-sm font-medium text-renovation-steel underline dark:text-renovation-accent"
          >
            {t("planning.taskPanel.editInProject")}
          </Link>
        </div>
      </aside>
    </>
  );
}
