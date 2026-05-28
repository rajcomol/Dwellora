"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AddLooseExpenseModal from "@/components/dashboard/AddLooseExpenseModal";
import BudgetOverviewSection from "@/components/dashboard/BudgetOverviewSection";
import FinancesSubtabNav, { type FinancesTab } from "@/components/dashboard/FinancesSubtabNav";
import ReportsPageClient from "@/components/dashboard/ReportsPageClient";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import BouwdepotDeclaratiesSection from "@/components/settings/BouwdepotDeclaratiesSection";
import Button from "@/components/ui/Button";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useI18n } from "@/i18n/provider";
import { aggregateSpendByRoom } from "@/lib/dashboard/reports";
import { filterTasksForProjectId } from "@/lib/dashboard/projectBudget";
import { formatCurrency } from "@/lib/format/currency";
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import type { ID, ProjectExpense } from "@/lib/renovation/types";

function parseFinancesTab(value: string | null): FinancesTab {
  if (value === "declaraties") return "declaraties";
  if (value === "uitgaven") return "uitgaven";
  if (value === "rapporten") return "rapporten";
  return "overzicht";
}

type ExpenseRowProps = {
  expense: ProjectExpense;
  onUpdate: (input: { id: ID; title?: string; amount?: number; spentOn?: string | null }) => void;
  onDelete: (id: ID) => void;
};

function FinancesExpenseRow({ expense, onUpdate, onDelete }: ExpenseRowProps) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(expense.title);
  const [amount, setAmount] = useState(String(expense.amount));
  const [spentOn, setSpentOn] = useState(expense.spentOn ?? "");

  if (editing) {
    return (
      <li className="rounded-lg border border-renovation-border bg-renovation-muted/30 p-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-renovation-border bg-renovation-elevated px-2 py-1.5 text-sm"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="rounded-md border border-renovation-border bg-renovation-elevated px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={spentOn}
            onChange={(e) => setSpentOn(e.target.value)}
            className="rounded-md border border-renovation-border bg-renovation-elevated px-2 py-1.5 text-sm"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <Button
            type="button"
            onClick={() => {
              const numeric = Number.parseFloat(amount);
              if (!title.trim() || !Number.isFinite(numeric) || numeric < 0) return;
              onUpdate({
                id: expense.id,
                title: title.trim(),
                amount: numeric,
                spentOn: spentOn.trim() || null,
              });
              setEditing(false);
            }}
          >
            {t("common.save")}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-renovation-border p-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{expense.title}</p>
        <p className="text-xs text-renovation-concrete">
          {expense.spentOn ? formatDisplayDate(expense.spentOn) : t("common.emDash")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(expense.amount)}</span>
        <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
          {t("common.edit")}
        </Button>
        <Button type="button" variant="secondary" onClick={() => onDelete(expense.id)}>
          {t("common.delete")}
        </Button>
      </div>
    </li>
  );
}

export default function FinancesPageClient() {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { selectedProject, selectedProjectId } = useSelectedProject();
  const {
    projects,
    rooms,
    tasks,
    projectExpenses,
    isRenovationDataReady,
    updateProjectExpense,
    deleteProjectExpense,
  } = useRenovation();

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const tabFromUrl = parseFinancesTab(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState<FinancesTab>(tabFromUrl);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const project = selectedProject ?? projects[0] ?? null;
  const projectId = selectedProjectId ?? project?.id ?? null;
  const roomIdFilter = searchParams.get("room_id");

  const setTab = useCallback(
    (tab: FinancesTab) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "overzicht") params.delete("tab");
      else params.set("tab", tab);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const roomRows = useMemo(() => {
    if (!projectId) return [];
    const projectRooms = rooms.filter((r) => r.projectId === projectId);
    const roomIds = new Set(projectRooms.map((r) => r.id));
    const projectTasks = filterTasksForProjectId(tasks, projectId, roomIds);
    const rows = aggregateSpendByRoom(projectTasks, projectRooms);
    if (!roomIdFilter) return rows;
    return rows.filter((r) => r.roomId === roomIdFilter);
  }, [projectId, rooms, tasks, roomIdFilter]);

  const looseExpenses = useMemo(() => {
    if (!projectId) return [];
    return projectExpenses
      .filter((e) => e.projectId === projectId && !e.taskId)
      .sort((a, b) => {
        const da = a.spentOn ?? a.createdAt;
        const db = b.spentOn ?? b.createdAt;
        return db.localeCompare(da);
      });
  }, [projectExpenses, projectId]);

  if (!isRenovationDataReady) return <DashboardPageSkeleton />;

  if (!project || !projectId) {
    return (
      <p className="text-sm text-renovation-concrete">
        {t("layout.topBar.chooseProject")}{" "}
        <Link href="/dashboard/projects" className="underline">
          {t("nav.projects")}
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("finances.title")}</h1>
        <p className="mt-1 text-sm text-renovation-concrete">{project.name}</p>
      </header>

      <FinancesSubtabNav activeTab={activeTab} onTabChange={setTab} />

      {activeTab === "overzicht" ? (
        <section className="space-y-4">
          <BudgetOverviewSection />
          <article
            data-testid="finances-room-summary"
            className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card"
          >
            <h2 className="text-base font-semibold text-foreground">{t("finances.roomSummaryTitle")}</h2>
            <p className="mt-1 text-xs text-renovation-concrete">{t("finances.roomSummaryHint")}</p>
            {roomRows.length === 0 ? (
              <p className="mt-4 text-sm text-renovation-concrete">{t("reports.noRoomsScope")}</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[22rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-renovation-border text-xs text-renovation-concrete">
                      <th className="pb-2 pr-2 font-medium">{t("reports.thRoom")}</th>
                      <th className="pb-2 pr-2 font-medium">{t("reports.thTasks")}</th>
                      <th className="pb-2 pr-2 font-medium">{t("reports.thEstimated")}</th>
                      <th className="pb-2 font-medium">{t("reports.thActual")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomRows.map((row) => (
                      <tr key={row.roomId} className="border-b border-renovation-border/80">
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
          </article>
        </section>
      ) : null}

      {activeTab === "declaraties" ? <BouwdepotDeclaratiesSection projectId={projectId} /> : null}

      {activeTab === "uitgaven" ? (
        <section
          data-testid="finances-expenses-tab"
          className="space-y-4 rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">{t("finances.expenseListTitle")}</h2>
            <Button type="button" data-testid="finances-add-expense" onClick={() => setIsAddExpenseOpen(true)}>
              {t("dashboard.looseExpenses.addButton")}
            </Button>
          </div>
          {looseExpenses.length === 0 ? (
            <p className="text-sm text-renovation-concrete">{t("dashboard.looseExpenses.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {looseExpenses.map((expense) => (
                <FinancesExpenseRow
                  key={expense.id}
                  expense={expense}
                  onUpdate={updateProjectExpense}
                  onDelete={(id) => deleteProjectExpense(id)}
                />
              ))}
            </ul>
          )}
          <AddLooseExpenseModal
            project={project}
            open={isAddExpenseOpen}
            onClose={() => setIsAddExpenseOpen(false)}
          />
        </section>
      ) : null}

      {activeTab === "rapporten" ? <ReportsPageClient embedded /> : null}
    </div>
  );
}
