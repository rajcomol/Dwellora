"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { filterTasksForProjectId } from "@/lib/dashboard/projectBudget";
import { taskBouwdepotChargeAmount } from "@/lib/dashboard/bouwdepot";
import { useI18n } from "@/i18n/provider";
import { formatCurrency } from "@/lib/format/currency";
import type { ID } from "@/lib/renovation/types";

export default function BouwdepotLinkedTasksSection({ projectId }: { projectId: ID }) {
  const { t } = useI18n();
  const { tasks, rooms } = useRenovation();

  const roomIds = useMemo(
    () => new Set(rooms.filter((r) => r.projectId === projectId).map((r) => r.id)),
    [rooms, projectId]
  );

  const linkedTasks = useMemo(() => {
    return filterTasksForProjectId(tasks, projectId, roomIds).filter((t) => t.fundedByConstructionDepot);
  }, [tasks, projectId, roomIds]);

  return (
    <section id="bouwdepot-taken" className="scroll-mt-6">
      <h2 className="text-lg font-semibold">{t("bouwdepot.linkedTasksTitle")}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("bouwdepot.linkedTasksHint")}</p>

      {linkedTasks.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{t("bouwdepot.noLinkedTasks")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-renovation-border rounded-lg border border-renovation-border dark:divide-renovation-border dark:border-renovation-border">
          {linkedTasks.map((task) => (
            <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <span className="text-sm font-medium">{task.title}</span>
              <span className="text-sm tabular-nums text-renovation-concrete">
                {formatCurrency(taskBouwdepotChargeAmount(task))}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/dashboard/projects/${projectId}`}
        className="mt-4 inline-block text-xs font-medium text-renovation-steel hover:underline dark:text-renovation-accent"
      >
        {t("bouwdepot.manageInProject")}
      </Link>
    </section>
  );
}
