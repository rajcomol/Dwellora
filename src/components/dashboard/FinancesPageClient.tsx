"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import BouwdepotSectie from "@/components/dashboard/BouwdepotSectie";
import KostenBewerkModal from "@/components/dashboard/KostenBewerkModal";
import KostenKeuzeModal from "@/components/dashboard/KostenKeuzeModal";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import Button from "@/components/ui/Button";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useI18n } from "@/i18n/provider";
import { filterTasksForProjectId, projectMoney } from "@/lib/dashboard/projectBudget";
import { formatCurrency } from "@/lib/format/currency";
import {
  mergeKostenItems,
  type KostenRegel,
  type KostenRegelType,
  type KostenStatus,
} from "@/lib/mergeKostenItems";
import type { ID, Project } from "@/lib/renovation/types";

type TypeFilter = "alle" | KostenRegelType;

function typeBadgeClass(type: KostenRegelType): string {
  switch (type) {
    case "taak":
      return "bg-renovation-muted text-renovation-steel dark:bg-renovation-muted/60";
    case "losse_uitgave":
      return "bg-renovation-accent/15 text-renovation-steel dark:bg-renovation-accent/20";
  }
}

function statusBadgeClass(status: KostenStatus): string {
  switch (status) {
    case "geschat":
      return "bg-renovation-muted text-renovation-concrete";
    case "werkelijk":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
}

function remainingAmountClass(pct: number): string {
  if (pct > 20) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 10) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
      />
    </svg>
  );
}

function typeLabel(t: (key: string) => string, type: KostenRegelType): string {
  if (type === "taak") return t("finances.unified.typeTaak");
  return t("finances.unified.typeLoose");
}

function statusLabel(t: (key: string) => string, status: KostenStatus): string {
  return status === "geschat"
    ? t("finances.unified.statusGeschat")
    : t("finances.unified.statusWerkelijk");
}

type BudgetCardsProps = {
  project: Project;
  regels: KostenRegel[];
};

function BudgetSummaryCards({ project, regels }: BudgetCardsProps) {
  const { t } = useI18n();
  const { total } = projectMoney(project);
  const besteed = regels.reduce((sum, r) => sum + r.bedrag, 0);
  const resterend = total - besteed;
  const spentPct = total > 0 ? Math.min(100, (besteed / total) * 100) : 0;
  const remainingPct = total > 0 ? Math.max(0, (resterend / total) * 100) : 0;

  return (
    <section data-testid="finances-budget-cards" className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <article className="rounded-xl border border-renovation-border bg-renovation-surface p-5 shadow-renovation-card">
        <h3 className="text-sm font-semibold text-foreground">{t("finances.unified.totalBudget")}</h3>
        <p
          data-testid="finances-budget-total"
          className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground"
        >
          {formatCurrency(total)}
        </p>
        <p className="mt-1 text-xs text-renovation-concrete">{t("finances.unified.totalBudgetHint")}</p>
      </article>

      <article className="rounded-xl border border-renovation-border bg-renovation-surface p-5 shadow-renovation-card">
        <h3 className="text-sm font-semibold text-foreground">{t("finances.unified.spentEstimated")}</h3>
        <p
          data-testid="finances-budget-spent"
          className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground"
        >
          {formatCurrency(besteed)}
        </p>
        <p className="mt-1 text-xs text-renovation-concrete">
          {t("finances.unified.spentOfBudget", { pct: Math.round(spentPct) })}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-renovation-muted">
          <div
            data-testid="finances-budget-spent-bar"
            className="h-full rounded-full bg-renovation-accent transition-all"
            style={{ width: `${spentPct}%` }}
          />
        </div>
      </article>

      <article className="rounded-xl border border-renovation-border bg-renovation-surface p-5 shadow-renovation-card">
        <h3 className="text-sm font-semibold text-foreground">{t("finances.unified.remaining")}</h3>
        <p
          data-testid="finances-budget-remaining"
          className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${remainingAmountClass(remainingPct)}`}
        >
          {formatCurrency(resterend)}
        </p>
        <p className="mt-1 text-xs text-renovation-concrete">
          {t("finances.unified.remainingPct", { pct: Math.round(remainingPct) })}
        </p>
      </article>
    </section>
  );
}

export default function FinancesPageClient() {
  const { t } = useI18n();
  const { selectedProject, selectedProjectId } = useSelectedProject();
  const {
    projects,
    rooms,
    tasks,
    projectExpenses,
    isRenovationDataReady,
    deleteTask,
    deleteProjectExpense,
  } = useRenovation();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("alle");
  const [categoryFilter, setCategoryFilter] = useState("alle");
  const [keuzeOpen, setKeuzeOpen] = useState(false);
  const [bewerkOpen, setBewerkOpen] = useState(false);
  const [bewerkType, setBewerkType] = useState<KostenRegelType>("taak");
  const [editingRegel, setEditingRegel] = useState<KostenRegel | null>(null);

  const project = selectedProject ?? projects[0] ?? null;
  const projectId = selectedProjectId ?? project?.id ?? null;

  const allRegels = useMemo(() => {
    if (!projectId) return [];
    const roomIds = new Set(rooms.filter((r) => r.projectId === projectId).map((r) => r.id));
    const projectTasks = filterTasksForProjectId(tasks, projectId, roomIds);
    const expenses = projectExpenses.filter((e) => e.projectId === projectId);
    return mergeKostenItems(projectTasks, expenses);
  }, [projectId, rooms, tasks, projectExpenses]);

  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRegels;
    return allRegels.filter((r) => r.omschrijving.toLowerCase().includes(q));
  }, [allRegels, search]);

  const typeFiltered = useMemo(() => {
    if (typeFilter === "alle") return searchFiltered;
    return searchFiltered.filter((r) => r.type === typeFilter);
  }, [searchFiltered, typeFilter]);

  const categories = useMemo(() => {
    const unique = new Set(typeFiltered.map((r) => r.categorie).filter(Boolean));
    return [...unique].sort((a, b) => a.localeCompare(b, "nl"));
  }, [typeFiltered]);

  const filteredRegels = useMemo(() => {
    if (categoryFilter === "alle") return typeFiltered;
    return typeFiltered.filter((r) => r.categorie === categoryFilter);
  }, [typeFiltered, categoryFilter]);

  const footerTotal = useMemo(
    () => filteredRegels.reduce((sum, r) => sum + r.bedrag, 0),
    [filteredRegels]
  );

  function openAddFlow() {
    setEditingRegel(null);
    setKeuzeOpen(true);
  }

  function handleKeuze(type: KostenRegelType) {
    setKeuzeOpen(false);
    setBewerkType(type);
    setEditingRegel(null);
    setBewerkOpen(true);
  }

  function openEdit(regel: KostenRegel) {
    setBewerkType(regel.type);
    setEditingRegel(regel);
    setBewerkOpen(true);
  }

  function handleDelete(regel: KostenRegel) {
    if (typeof window !== "undefined" && !window.confirm(t("finances.unified.confirmDelete"))) return;

    if (regel.type === "taak") {
      deleteTask(regel.source_id as ID);
    } else {
      deleteProjectExpense(regel.source_id as ID);
    }
  }

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
    <div className="space-y-6" data-testid="finances-page">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("finances.title")}</h1>
          <p className="mt-1 text-sm text-renovation-concrete">{project.name}</p>
        </div>
        <Button type="button" data-testid="finances-add-button" onClick={openAddFlow}>
          {t("finances.unified.addButton")}
        </Button>
      </header>

      <BudgetSummaryCards project={project} regels={allRegels} />

      <section className="space-y-4 rounded-xl border border-renovation-border bg-renovation-elevated p-4 shadow-renovation-card sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            type="search"
            data-testid="finances-search-filter"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("finances.unified.searchPlaceholder")}
            className="rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-renovation-accent/40"
          />
          <select
            data-testid="finances-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-renovation-accent/40"
          >
            <option value="alle">{t("finances.unified.filterAllTypes")}</option>
            <option value="taak">{t("finances.unified.filterTasks")}</option>
            <option value="losse_uitgave">{t("finances.unified.filterLoose")}</option>
          </select>
          <select
            data-testid="finances-category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-renovation-accent/40"
          >
            <option value="alle">{t("finances.unified.filterAllCategories")}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto" data-testid="finances-kosten-table">
          {filteredRegels.length === 0 ? (
            <p className="py-8 text-center text-sm text-renovation-concrete">{t("finances.unified.emptyTable")}</p>
          ) : (
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead>
                <tr className="border-b border-renovation-border text-xs text-renovation-concrete">
                  <th className="pb-2 pr-3 font-medium">{t("finances.unified.colDescription")}</th>
                  <th className="hidden pb-2 pr-3 font-medium sm:table-cell">{t("finances.unified.colType")}</th>
                  <th className="hidden pb-2 pr-3 font-medium md:table-cell">{t("finances.unified.colCategory")}</th>
                  <th className="pb-2 pr-3 text-right font-medium">{t("finances.unified.colAmount")}</th>
                  <th className="pb-2 pr-3 font-medium">{t("finances.unified.colStatus")}</th>
                  <th className="pb-2 font-medium">
                    <span className="sr-only">{t("finances.unified.colActions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRegels.map((regel) => (
                  <tr
                    key={regel.id}
                    data-testid="finances-kosten-row"
                    data-kosten-type={regel.type}
                    data-kosten-status={regel.status}
                    className="group border-b border-renovation-border/80"
                  >
                    <td className="py-2.5 pr-3 font-medium text-foreground">{regel.omschrijving}</td>
                    <td className="hidden py-2.5 pr-3 sm:table-cell">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(regel.type)}`}>
                        {typeLabel(t, regel.type)}
                      </span>
                    </td>
                    <td className="hidden py-2.5 pr-3 text-renovation-concrete md:table-cell">{regel.categorie}</td>
                    <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-foreground">
                      {formatCurrency(regel.bedrag)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(regel.status)}`}
                      >
                        {statusLabel(t, regel.status)}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          data-testid="finances-kosten-edit"
                          aria-label={t("common.edit")}
                          className="rounded-md p-1.5 text-renovation-concrete transition-colors hover:bg-renovation-muted hover:text-foreground"
                          onClick={() => openEdit(regel)}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          data-testid="finances-kosten-delete"
                          aria-label={t("common.delete")}
                          className="rounded-md p-1.5 text-renovation-concrete transition-colors hover:bg-renovation-muted hover:text-red-600 dark:hover:text-red-400"
                          onClick={() => handleDelete(regel)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-renovation-border">
                  <td colSpan={6} className="pt-3 text-sm text-renovation-concrete">
                    {t("finances.unified.tableFooter", {
                      count: filteredRegels.length,
                      total: formatCurrency(footerTotal),
                    })}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </section>

      <BouwdepotSectie project={project} projectId={projectId} />

      <KostenKeuzeModal open={keuzeOpen} onClose={() => setKeuzeOpen(false)} onChoose={handleKeuze} />
      <KostenBewerkModal
        project={project}
        open={bewerkOpen}
        type={bewerkType}
        regel={editingRegel}
        onClose={() => setBewerkOpen(false)}
      />
    </div>
  );
}
