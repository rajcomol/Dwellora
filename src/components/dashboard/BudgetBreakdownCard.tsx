"use client";

import { useMemo } from "react";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import {
  computeProjectBudgetBreakdown,
  filterTasksForProjectId,
} from "@/lib/dashboard/projectBudget";
import { formatCurrency } from "@/lib/format/currency";

export default function BudgetBreakdownCard() {
  const { t } = useI18n();
  const { selectedProject } = useSelectedProject();
  const { projects, rooms, tasks } = useRenovation();

  const project = selectedProject ?? projects[0] ?? null;

  const breakdown = useMemo(() => {
    if (!project) return null;
    const roomIds = new Set(rooms.filter((r) => r.projectId === project.id).map((r) => r.id));
    const filtered = filterTasksForProjectId(tasks, project.id, roomIds);
    return computeProjectBudgetBreakdown(project, filtered);
  }, [project, rooms, tasks]);

  if (!breakdown || breakdown.totalBudget <= 0) {
    return (
      <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated">
        <h2 className="text-sm font-semibold text-renovation-steel dark:text-zinc-200">
          {t("budget.breakdown")}
        </h2>
        <p className="mt-2 text-sm text-renovation-concrete">{t("budget.breakdownEmpty")}</p>
      </section>
    );
  }

  const { ownContribution, constructionDepotTotal, spentDone, totalBudget } = breakdown;
  const ownPct = totalBudget > 0 ? (ownContribution / totalBudget) * 100 : 0;
  const depotPct = totalBudget > 0 ? (constructionDepotTotal / totalBudget) * 100 : 0;
  const spentPct = totalBudget > 0 ? Math.min(100, (spentDone / totalBudget) * 100) : 0;

  return (
    <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated">
      <h2 className="text-sm font-semibold text-renovation-steel dark:text-zinc-200">{t("budget.breakdown")}</h2>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        {ownPct > 0 ? (
          <div className="h-full bg-emerald-500" style={{ width: `${ownPct}%` }} title={t("budget.ownMoney")} />
        ) : null}
        {depotPct > 0 ? (
          <div className="h-full bg-blue-500" style={{ width: `${depotPct}%` }} title={t("budget.depotTotal")} />
        ) : null}
        {spentPct > 0 ? (
          <div className="h-full bg-red-500" style={{ width: `${spentPct}%` }} title={t("budget.spentDone")} />
        ) : null}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        <li className="flex justify-between gap-4">
          <span className="text-renovation-concrete">{t("budget.ownMoney")}</span>
          <span className="font-medium tabular-nums">{formatCurrency(ownContribution)}</span>
        </li>
        <li className="flex justify-between gap-4">
          <span className="text-renovation-concrete">{t("budget.depotTotal")}</span>
          <span className="font-medium tabular-nums">{formatCurrency(constructionDepotTotal)}</span>
        </li>
        <li className="flex justify-between gap-4">
          <span className="text-renovation-concrete">{t("budget.spentDone")}</span>
          <span className="font-medium tabular-nums text-red-600 dark:text-red-400">
            {formatCurrency(spentDone)}
          </span>
        </li>
      </ul>
    </section>
  );
}
