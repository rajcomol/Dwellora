"use client";

import { useI18n } from "@/i18n/provider";
import { formatCurrency } from "@/lib/format/currency";
import { compareTasksByStartDate, formatTaskDateRange, taskEndDate } from "@/lib/renovation/taskDates";
import type { Task } from "@/lib/renovation/types";

type Props = {
  tasks: Task[];
  roomNameById: Map<string, string>;
  onTaskClick: (task: Task) => void;
};

function statusProgress(status: Task["status"]): number {
  if (status === "done") return 100;
  if (status === "doing") return 50;
  return 0;
}

function statusBarClass(status: Task["status"]): string {
  if (status === "done") return "bg-emerald-500";
  if (status === "doing") return "bg-amber-500";
  return "bg-zinc-300 dark:bg-zinc-600";
}

export default function PlanningTaskList({ tasks, roomNameById, onTaskClick }: Props) {
  const { t } = useI18n();
  const sorted = [...tasks].sort(compareTasksByStartDate);

  if (sorted.length === 0) {
    return <p className="text-sm text-renovation-concrete">{t("planning.empty")}</p>;
  }

  return (
    <ul className="space-y-3">
      {sorted.map((tk) => {
        const roomLabel =
          tk.roomIds.length === 0
            ? t("planning.looseTask")
            : tk.roomIds
                .map((rid) => roomNameById.get(rid))
                .filter(Boolean)
                .join(", ") || t("planning.looseTask");
        const end = taskEndDate(tk);
        return (
          <li key={tk.id}>
            <button
              type="button"
              onClick={() => onTaskClick(tk)}
              className="w-full rounded-xl border border-renovation-border bg-renovation-elevated px-4 py-3 text-left shadow-sm dark:border-renovation-border dark:bg-renovation-elevated"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{tk.title}</span>
                <span className="shrink-0 rounded-full bg-renovation-muted px-2 py-0.5 text-xs font-medium dark:bg-zinc-800">
                  {t(`task.status.${tk.status}`)}
                </span>
              </div>
              <p className="mt-1 text-xs text-renovation-concrete">
                {roomLabel} • {formatTaskDateRange(tk.startDate, end, t)}
                {tk.estimatedCost != null ? ` • ${formatCurrency(tk.estimatedCost)}` : ""}
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-renovation-muted dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full ${statusBarClass(tk.status)}`}
                  style={{ width: `${statusProgress(tk.status)}%` }}
                />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
