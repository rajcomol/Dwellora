"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { ReportsPageSkeleton } from "@/components/ui/Skeleton";
import Card from "@/components/ui/Card";
import { useI18n } from "@/i18n/provider";
import { formatCurrency } from "@/lib/format/currency";
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import { filterTasksForProjectId, looseExpensesForBudget } from "@/lib/dashboard/projectBudget";
import { sumEstimatedCostsUnique } from "@/lib/dashboard/taskCosts";
import { aggregateSpendByRoom, projectBudgetSummary } from "@/lib/dashboard/reports";

export default function ReportsPageClient() {
  const { t } = useI18n();
  const { projects, rooms, tasks, projectExpenses, isRenovationDataReady } = useRenovation();
  const { selectedProjectId } = useSelectedProject();
  const [projectFilter, setProjectFilter] = useState<string>("all");

  useEffect(() => {
    if (selectedProjectId) setProjectFilter(selectedProjectId);
  }, [selectedProjectId]);

  const projectNameById = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  const roomIdsByProject = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const r of rooms) {
      const set = m.get(r.projectId) ?? new Set<string>();
      set.add(r.id);
      m.set(r.projectId, set);
    }
    return m;
  }, [rooms]);

  const filteredTasks = useMemo(() => {
    if (projectFilter === "all") return tasks;
    const ids = roomIdsByProject.get(projectFilter);
    if (!ids) return [];
    return filterTasksForProjectId(tasks, projectFilter, ids);
  }, [tasks, projectFilter, roomIdsByProject]);

  const filteredRooms = useMemo(() => {
    if (projectFilter === "all") return rooms;
    return rooms.filter((r) => r.projectId === projectFilter);
  }, [rooms, projectFilter]);

  const filteredExpenses = useMemo(() => {
    if (projectFilter === "all") return projectExpenses;
    return projectExpenses.filter((e) => e.projectId === projectFilter);
  }, [projectFilter, projectExpenses]);

  const sortedExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [filteredExpenses]);

  const byRoom = useMemo(() => aggregateSpendByRoom(filteredTasks, filteredRooms), [filteredTasks, filteredRooms]);

  const totals = useMemo(() => {
    const est = sumEstimatedCostsUnique(filteredTasks);
    const actTasks = filteredTasks.reduce((s, tk) => s + tk.actualCost, 0);
    const actLoose = looseExpensesForBudget(filteredExpenses, filteredTasks).reduce(
      (s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0),
      0
    );
    const act = actTasks + actLoose;
    const budget =
      projectFilter === "all"
        ? projects.reduce((s, p) => s + p.totalBudget, 0)
        : projects.find((p) => p.id === projectFilter)?.totalBudget ?? 0;
    return { est, act, actTasks, actLoose, budget, gap: budget - est, estVsAct: est - act };
  }, [filteredTasks, filteredExpenses, projects, projectFilter]);

  if (!isRenovationDataReady) {
    return <ReportsPageSkeleton />;
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("reports.title")}</h1>
          <p className="mt-1 text-sm leading-relaxed text-renovation-concrete">{t("reports.subtitle")}</p>
        </div>
        <div className="sm:w-64">
          <label className="mb-1 block text-xs text-renovation-concrete">{t("reports.scope")}</label>
          <select
            data-testid="reports-bereik-select"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
          >
            <option value="all">{t("reports.allProjects")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-xs text-renovation-concrete">{t("reports.totalBudgetScope")}</div>
          <div className="mt-2 text-lg font-semibold tabular-nums">{formatCurrency(totals.budget)}</div>
        </Card>
        <Card>
          <div className="text-xs text-renovation-concrete">{t("reports.sumEstimates")}</div>
          <div className="mt-2 text-lg font-semibold tabular-nums">{formatCurrency(totals.est)}</div>
        </Card>
        <Card>
          <div className="text-xs text-renovation-concrete">{t("reports.sumActuals")}</div>
          <div className="mt-2 text-lg font-semibold tabular-nums">{formatCurrency(totals.act)}</div>
          <div className="mt-1 text-xs text-renovation-concrete">
            {t("reports.sumActualsBreakdown", {
              tasks: formatCurrency(totals.actTasks),
              loose: formatCurrency(totals.actLoose),
            })}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-renovation-concrete">{t("reports.budgetMinusEstimates")}</div>
          <div className="mt-2 text-lg font-semibold tabular-nums">{formatCurrency(totals.gap)}</div>
        </Card>
      </div>

      {projectFilter !== "all" ? (
        <Card>
          <h2 className="text-base font-semibold">{t("reports.selectedProject")}</h2>
          {(() => {
            const p = projects.find((x) => x.id === projectFilter);
            if (!p) return null;
            const pRooms = rooms.filter((r) => r.projectId === p.id);
            const pRoomIds = new Set(pRooms.map((r) => r.id));
            const pTasks = filterTasksForProjectId(tasks, p.id, pRoomIds);
            const pExp = projectExpenses.filter((e) => e.projectId === p.id);
            const s = projectBudgetSummary(p, pTasks, pExp);
            return (
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-renovation-concrete">{t("reports.address")}</dt>
                  <dd>{p.address || t("common.emDash")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-renovation-concrete">{t("reports.keyHandover")}</dt>
                  <dd>
                    {p.expectedKeyHandover ? formatDisplayDate(p.expectedKeyHandover) : t("common.emDash")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-renovation-concrete">{t("reports.budgetVsEstimated")}</dt>
                  <dd className="tabular-nums">{formatCurrency(s.budgetVsEstimated)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-renovation-concrete">{t("reports.estimatedVsActual")}</dt>
                  <dd className="tabular-nums">{formatCurrency(s.estimatedVsActual)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-renovation-concrete">{t("reports.actualFromTasks")}</dt>
                  <dd className="tabular-nums">{formatCurrency(s.totalActualFromTasks)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-renovation-concrete">{t("reports.looseExpensesTotal")}</dt>
                  <dd className="tabular-nums">{formatCurrency(s.totalLooseExpenses)}</dd>
                </div>
              </dl>
            );
          })()}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold">{t("reports.looseExpensesTitle")}</h2>
          <p className="mt-1 text-xs text-renovation-concrete">{t("reports.looseExpensesHint")}</p>
          {sortedExpenses.length === 0 ? (
            <p className="mt-3 text-sm text-renovation-concrete">{t("reports.noLooseExpensesScope")}</p>
          ) : (
            <div className="mt-4 min-w-0 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-renovation-border text-xs text-renovation-concrete dark:border-renovation-border">
                    {projectFilter === "all" ? (
                      <th className="pb-2 pr-2 font-medium">{t("reports.thProject")}</th>
                    ) : null}
                    <th className="pb-2 pr-2 font-medium">{t("reports.thExpenseTitle")}</th>
                    <th className="pb-2 pr-2 font-medium">{t("reports.thDate")}</th>
                    <th className="pb-2 pr-2 font-medium">{t("reports.thAmount")}</th>
                    <th className="pb-2 font-medium">{t("reports.thNotes")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedExpenses.map((row) => (
                    <tr key={row.id} className="border-b border-renovation-border dark:border-renovation-border/80">
                      {projectFilter === "all" ? (
                        <td className="py-2 pr-2">{projectNameById.get(row.projectId) ?? row.projectId}</td>
                      ) : null}
                      <td className="py-2 pr-2">{row.title}</td>
                      <td className="py-2 pr-2 tabular-nums">
                        {row.spentOn ? formatDisplayDate(row.spentOn) : t("common.emDash")}
                      </td>
                      <td className="py-2 pr-2 tabular-nums">{formatCurrency(row.amount)}</td>
                      <td className="max-w-[12rem] truncate py-2 text-renovation-concrete" title={row.notes}>
                        {row.notes || t("common.emDash")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card data-testid="reports-by-room">
          <h2 className="text-base font-semibold">{t("reports.byRoom")}</h2>
          <p className="mt-1 text-xs text-renovation-concrete">{t("reports.byRoomHint")}</p>
          {byRoom.length === 0 ? (
            <p className="mt-3 text-sm text-renovation-concrete">{t("reports.noRoomsScope")}</p>
          ) : (
            <div className="mt-4 min-w-0 overflow-x-auto">
              <table className="w-full min-w-[22rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-renovation-border text-xs text-renovation-concrete dark:border-renovation-border">
                    <th className="pb-2 pr-2 font-medium">{t("reports.thRoom")}</th>
                    <th className="pb-2 pr-2 font-medium">{t("reports.thTasks")}</th>
                    <th className="pb-2 pr-2 font-medium">{t("reports.thEstimated")}</th>
                    <th className="pb-2 font-medium">{t("reports.thActual")}</th>
                  </tr>
                </thead>
                <tbody>
                  {byRoom.map((row) => (
                    <tr key={row.roomId} className="border-b border-renovation-border dark:border-renovation-border/80">
                      <td className="py-2 pr-2">{row.roomName}</td>
                      <td className="py-2 pr-2 tabular-nums">{row.taskCount}</td>
                      <td className="py-2 pr-2 tabular-nums">{formatCurrency(row.estimated)}</td>
                      <td className="py-2 tabular-nums">{formatCurrency(row.actual)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
