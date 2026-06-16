"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import BouwdepotSectie from "@/components/dashboard/BouwdepotSectie";
import KostenBewerkModal from "@/components/dashboard/KostenBewerkModal";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import Button from "@/components/ui/Button";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useI18n } from "@/i18n/provider";
import { projectMoney } from "@/lib/dashboard/projectBudget";
import { categorieLabel, KOST_CATEGORIE_ORDER } from "@/lib/finances/kostenraming";
import { formatCurrency } from "@/lib/format/currency";
import { mergeKostenItems, type KostenRegel, type KostenStatus } from "@/lib/mergeKostenItems";
import type { BouwdepotStatus, ID, KostCategorie, Project } from "@/lib/renovation/types";

type StatusFilter = "alle" | KostenStatus;
type ViewMode = "flat" | "category";

function statusBadgeClass(status: KostenStatus): string {
  switch (status) {
    case "geschat":
      return "bg-renovation-muted text-renovation-concrete";
    case "werkelijk":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
}

function bouwdepotIndicatorClass(): string {
  return "bg-renovation-accent/15 text-renovation-steel dark:bg-renovation-accent/20";
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

function statusLabel(t: (key: string) => string, status: KostenStatus): string {
  return status === "geschat"
    ? t("finances.unified.statusGeschat")
    : t("finances.unified.statusWerkelijk");
}

function bouwdepotStatusLabel(t: (key: string) => string, status: BouwdepotStatus): string {
  if (status === "ingediend") return t("finances.unified.statusIngediend");
  if (status === "uitbetaald") return t("finances.unified.statusUitbetaald");
  return t("finances.unified.statusOpen");
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
        <h3 className="text-sm font-semibold text-foreground">{t("finances.unified.spent")}</h3>
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

type KostenRowProps = {
  regel: KostenRegel;
  onEdit: (regel: KostenRegel) => void;
  onDelete: (regel: KostenRegel) => void;
};

function KostenTableRow({ regel, onEdit, onDelete }: KostenRowProps) {
  const { t } = useI18n();

  return (
    <tr
      data-testid="finances-kosten-row"
      data-kosten-status={regel.kostType}
      data-kosten-categorie={regel.categorieId}
      className="group border-b border-renovation-border/80"
    >
      <td className="py-2.5 pr-3 font-medium text-foreground">{regel.omschrijving}</td>
      <td className="hidden py-2.5 pr-3 text-renovation-concrete md:table-cell">{regel.categorie}</td>
      <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-foreground">
        {formatCurrency(regel.bedrag)}
      </td>
      <td className="py-2.5 pr-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(regel.kostType)}`}>
          {statusLabel(t, regel.kostType)}
        </span>
      </td>
      <td className="hidden py-2.5 pr-3 sm:table-cell">
        {regel.gekoppeld_aan_depot ? (
          <span
            data-testid="finances-kosten-depot-badge"
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${bouwdepotIndicatorClass()}`}
          >
            {t("finances.unified.depotIndicator", {
              status: bouwdepotStatusLabel(t, regel.bouwdepotStatus),
            })}
          </span>
        ) : (
          <span className="text-xs text-renovation-concrete">{t("common.emDash")}</span>
        )}
      </td>
      <td className="py-2.5">
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            data-testid="finances-kosten-edit"
            aria-label={t("common.edit")}
            className="rounded-md p-1.5 text-renovation-concrete transition-colors hover:bg-renovation-muted hover:text-foreground"
            onClick={() => onEdit(regel)}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            data-testid="finances-kosten-delete"
            aria-label={t("common.delete")}
            className="rounded-md p-1.5 text-renovation-concrete transition-colors hover:bg-renovation-muted hover:text-red-600 dark:hover:text-red-400"
            onClick={() => onDelete(regel)}
          >
            <TrashIcon />
          </button>
        </div>
      </td>
    </tr>
  );
}

type CategoryGroup = {
  id: KostCategorie;
  label: string;
  regels: KostenRegel[];
  subtotal: number;
  sharePct: number;
};

export default function FinancesPageClient() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const { selectedProject, selectedProjectId } = useSelectedProject();
  const { projects, projectExpenses, isRenovationDataReady, deleteProjectExpense } = useRenovation();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [categoryFilter, setCategoryFilter] = useState<"alle" | KostCategorie>("alle");
  const [viewMode, setViewMode] = useState<ViewMode>("flat");
  const [bewerkOpen, setBewerkOpen] = useState(false);
  const [editingRegel, setEditingRegel] = useState<KostenRegel | null>(null);

  const project = selectedProject ?? projects[0] ?? null;
  const projectId = selectedProjectId ?? project?.id ?? null;

  const allRegels = useMemo(() => {
    if (!projectId) return [];
    const expenses = projectExpenses.filter((e) => e.projectId === projectId);
    return mergeKostenItems(expenses);
  }, [projectId, projectExpenses]);

  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRegels;
    return allRegels.filter((r) => r.omschrijving.toLowerCase().includes(q));
  }, [allRegels, search]);

  const statusFiltered = useMemo(() => {
    if (statusFilter === "alle") return searchFiltered;
    return searchFiltered.filter((r) => r.kostType === statusFilter);
  }, [searchFiltered, statusFilter]);

  const availableCategories = useMemo(() => {
    const ids = new Set(statusFiltered.map((r) => r.categorieId));
    return KOST_CATEGORIE_ORDER.filter((id) => ids.has(id));
  }, [statusFiltered]);

  const effectiveCategoryFilter = useMemo(() => {
    if (categoryFilter === "alle") return "alle" as const;
    return availableCategories.includes(categoryFilter) ? categoryFilter : ("alle" as const);
  }, [categoryFilter, availableCategories]);

  useEffect(() => {
    if (categoryFilter !== "alle" && effectiveCategoryFilter === "alle") {
      setCategoryFilter("alle");
    }
  }, [categoryFilter, effectiveCategoryFilter]);

  const filteredRegels = useMemo(() => {
    if (effectiveCategoryFilter === "alle") return statusFiltered;
    return statusFiltered.filter((r) => r.categorieId === effectiveCategoryFilter);
  }, [statusFiltered, effectiveCategoryFilter]);

  const footerTotal = useMemo(
    () => filteredRegels.reduce((sum, r) => sum + r.bedrag, 0),
    [filteredRegels]
  );

  const categoryGroups = useMemo((): CategoryGroup[] => {
    const total = filteredRegels.reduce((s, r) => s + r.bedrag, 0);
    const byId = new Map<KostCategorie, KostenRegel[]>();
    for (const regel of filteredRegels) {
      const arr = byId.get(regel.categorieId) ?? [];
      arr.push(regel);
      byId.set(regel.categorieId, arr);
    }
    return KOST_CATEGORIE_ORDER.filter((id) => byId.has(id)).map((id) => {
      const regels = byId.get(id) ?? [];
      const subtotal = regels.reduce((s, r) => s + r.bedrag, 0);
      return {
        id,
        label: categorieLabel(id),
        regels,
        subtotal,
        sharePct: total > 0 ? (subtotal / total) * 100 : 0,
      };
    });
  }, [filteredRegels]);

  function openAddFlow() {
    setEditingRegel(null);
    setBewerkOpen(true);
  }

  useEffect(() => {
    if (searchParams.get("add") === "1" && projectId) {
      openAddFlow();
    }
  }, [searchParams, projectId]);

  function openEdit(regel: KostenRegel) {
    setEditingRegel(regel);
    setBewerkOpen(true);
  }

  function handleDelete(regel: KostenRegel) {
    if (typeof window !== "undefined" && !window.confirm(t("finances.unified.confirmDelete"))) return;
    deleteProjectExpense(regel.source_id as ID);
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex rounded-lg border border-renovation-border bg-renovation-surface p-0.5"
            role="group"
            aria-label={t("finances.unified.viewModeLabel")}
          >
            <button
              type="button"
              data-testid="finances-view-flat"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "flat"
                  ? "bg-renovation-accent text-white"
                  : "text-renovation-concrete hover:text-foreground"
              }`}
              onClick={() => setViewMode("flat")}
            >
              {t("finances.unified.viewFlat")}
            </button>
            <button
              type="button"
              data-testid="finances-view-category"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "category"
                  ? "bg-renovation-accent text-white"
                  : "text-renovation-concrete hover:text-foreground"
              }`}
              onClick={() => setViewMode("category")}
            >
              {t("finances.unified.viewCategory")}
            </button>
          </div>
        </div>

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
            data-testid="finances-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-renovation-accent/40"
          >
            <option value="alle">{t("finances.unified.filterAllStatuses")}</option>
            <option value="werkelijk">{t("finances.unified.statusWerkelijk")}</option>
            <option value="geschat">{t("finances.unified.statusGeschat")}</option>
          </select>
          <select
            data-testid="finances-category-filter"
            value={effectiveCategoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as "alle" | KostCategorie)}
            className="rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-renovation-accent/40"
          >
            <option value="alle">{t("finances.unified.filterAllCategories")}</option>
            {availableCategories.map((id) => (
              <option key={id} value={id}>
                {categorieLabel(id)}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto" data-testid="finances-kosten-table">
          {filteredRegels.length === 0 ? (
            <p className="py-8 text-center text-sm text-renovation-concrete">{t("finances.unified.emptyTable")}</p>
          ) : viewMode === "flat" ? (
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead>
                <tr className="border-b border-renovation-border text-xs text-renovation-concrete">
                  <th className="pb-2 pr-3 font-medium">{t("finances.unified.colDescription")}</th>
                  <th className="hidden pb-2 pr-3 font-medium md:table-cell">{t("finances.unified.colCategory")}</th>
                  <th className="pb-2 pr-3 text-right font-medium">{t("finances.unified.colAmount")}</th>
                  <th className="pb-2 pr-3 font-medium">{t("finances.unified.colStatus")}</th>
                  <th className="hidden pb-2 pr-3 font-medium sm:table-cell">{t("finances.unified.colDepot")}</th>
                  <th className="pb-2 font-medium">
                    <span className="sr-only">{t("finances.unified.colActions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRegels.map((regel) => (
                  <KostenTableRow key={regel.id} regel={regel} onEdit={openEdit} onDelete={handleDelete} />
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
          ) : (
            <div className="space-y-6" data-testid="finances-category-groups">
              {categoryGroups.map((group) => (
                <div key={group.id} data-testid="finances-category-group" data-category={group.id}>
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                      <p className="text-xs text-renovation-concrete">
                        {t("finances.unified.categoryGroupMeta", {
                          count: group.regels.length,
                          subtotal: formatCurrency(group.subtotal),
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="mb-3 h-1 overflow-hidden rounded-full bg-renovation-muted">
                    <div
                      data-testid="finances-category-share-bar"
                      className="h-full rounded-full bg-renovation-accent transition-all"
                      style={{ width: `${group.sharePct}%` }}
                    />
                  </div>
                  <table className="w-full min-w-[20rem] text-left text-sm">
                    <tbody>
                      {group.regels.map((regel) => (
                        <KostenTableRow key={regel.id} regel={regel} onEdit={openEdit} onDelete={handleDelete} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <BouwdepotSectie project={project} projectId={projectId} />

      <KostenBewerkModal
        project={project}
        open={bewerkOpen}
        regel={editingRegel}
        onClose={() => setBewerkOpen(false)}
      />
    </div>
  );
}
