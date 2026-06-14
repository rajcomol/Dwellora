"use client";

import { useMemo, useState } from "react";
import KostenBewerkModal from "@/components/dashboard/KostenBewerkModal";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { bouwdepotRemainingAmountClass, computeBouwdepotUsage } from "@/lib/dashboard/bouwdepot";
import { declaratieStatusBadgeClass } from "@/lib/dashboard/bouwdepotDeclaraties";
import { filterTasksForProjectId } from "@/lib/dashboard/projectBudget";
import { formatCurrency } from "@/lib/format/currency";
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import { mergeBouwdepotItems, type BouwdepotRegel, type BouwdepotRegelType } from "@/lib/mergeBouwdepotItems";
import type { ID, Project } from "@/lib/renovation/types";

function typeBadgeClass(type: BouwdepotRegelType): string {
  switch (type) {
    case "declaratie":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
    case "losse_uitgave":
      return "bg-renovation-accent/15 text-renovation-steel dark:bg-renovation-accent/20";
    case "taak":
      return "bg-renovation-muted text-renovation-steel dark:bg-renovation-muted/60";
  }
}

function typeLabel(t: (key: string) => string, type: BouwdepotRegelType): string {
  if (type === "declaratie") return t("finances.unified.typeDeclaratie");
  if (type === "losse_uitgave") return t("finances.unified.typeLoose");
  return t("finances.unified.typeTaak");
}

function statusLabel(t: (key: string) => string, regel: BouwdepotRegel): string {
  if (regel.status === "gekoppeld") return t("finances.bouwdepotSection.statusLinked");
  if (regel.status === "open") return t("finances.unified.statusOpen");
  if (regel.status === "ingediend") return t("finances.unified.statusIngediend");
  return t("finances.unified.statusUitbetaald");
}

function statusBadgeClass(regel: BouwdepotRegel): string {
  if (regel.status === "gekoppeld") return "bg-renovation-muted text-renovation-concrete";
  if (regel.type === "declaratie" && regel.declaratieStatus) {
    return declaratieStatusBadgeClass(regel.declaratieStatus);
  }
  return "bg-renovation-muted text-renovation-concrete";
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

type Props = {
  project: Project;
  projectId: ID;
};

export default function BouwdepotSectie({ project, projectId }: Props) {
  const { t } = useI18n();
  const { declaraties, tasks, projectExpenses, rooms, deleteDeclaratie } = useRenovation();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<ID | null>(null);

  const projectTasks = useMemo(() => {
    const roomIds = new Set(rooms.filter((r) => r.projectId === projectId).map((r) => r.id));
    return filterTasksForProjectId(tasks, projectId, roomIds);
  }, [rooms, tasks, projectId]);

  const projectExpensesFiltered = useMemo(
    () => projectExpenses.filter((e) => e.projectId === projectId),
    [projectExpenses, projectId]
  );

  const usage = useMemo(
    () => computeBouwdepotUsage(project, projectTasks, projectExpensesFiltered, declaraties ?? []),
    [project, projectTasks, projectExpensesFiltered, declaraties]
  );

  const rows = useMemo(
    () => mergeBouwdepotItems(projectId, declaraties ?? [], projectExpensesFiltered, projectTasks),
    [projectId, declaraties, projectExpensesFiltered, projectTasks]
  );

  function openAdd() {
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(id: ID) {
    setEditingId(id);
    setModalOpen(true);
  }

  async function handleDelete(id: ID) {
    if (typeof window !== "undefined" && !window.confirm(t("finances.unified.confirmDelete"))) return;
    await deleteDeclaratie(id);
  }

  return (
    <section
      data-testid="finances-bouwdepot-section"
      className="space-y-4 rounded-xl border border-renovation-border bg-renovation-surface p-4 shadow-renovation-card sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{t("finances.bouwdepotSection.title")}</h2>
        <Button type="button" data-testid="bouwdepot-add-declaratie" onClick={openAdd}>
          {t("finances.bouwdepotSection.addButton")}
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div
          data-testid="bouwdepot-stat-totaal"
          className="rounded-lg border border-renovation-border bg-renovation-elevated px-4 py-3"
        >
          <p className="text-xs font-medium text-renovation-concrete">{t("finances.bouwdepotSection.statTotal")}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(usage.totalAmount)}
          </p>
        </div>
        <div
          data-testid="bouwdepot-stat-ingediend"
          className="rounded-lg border border-renovation-border bg-renovation-elevated px-4 py-3"
        >
          <p className="text-xs font-medium text-renovation-concrete">{t("finances.bouwdepotSection.statSubmitted")}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(usage.ingediendDeclaraties)}
          </p>
        </div>
        <div
          data-testid="bouwdepot-stat-uitbetaald"
          className="rounded-lg border border-renovation-border bg-renovation-elevated px-4 py-3"
        >
          <p className="text-xs font-medium text-renovation-concrete">{t("finances.bouwdepotSection.statPaid")}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(usage.uitbetaaldDeclaraties)}
          </p>
        </div>
        <div
          data-testid="bouwdepot-stat-resterend"
          className="rounded-lg border border-renovation-border bg-renovation-elevated px-4 py-3"
        >
          <p className="text-xs font-medium text-renovation-concrete">{t("finances.bouwdepotSection.statRemaining")}</p>
          <p
            data-testid="bouwdepot-stat-resterend-amount"
            className={`mt-1 text-lg font-semibold tabular-nums ${bouwdepotRemainingAmountClass(usage.remainingAmount, usage.totalAmount)}`}
          >
            {formatCurrency(usage.remainingAmount)}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-renovation-concrete">{t("finances.bouwdepotSection.empty")}</p>
      ) : (
        <div className="overflow-x-auto" data-testid="bouwdepot-items-table">
          <table className="w-full min-w-[24rem] text-left text-sm">
            <thead>
              <tr className="border-b border-renovation-border text-xs text-renovation-concrete">
                <th className="pb-2 pr-3 font-medium">{t("finances.unified.colDescription")}</th>
                <th className="hidden pb-2 pr-3 font-medium sm:table-cell">{t("finances.unified.colType")}</th>
                <th className="pb-2 pr-3 text-right font-medium">{t("finances.unified.colAmount")}</th>
                <th className="hidden pb-2 pr-3 font-medium md:table-cell">{t("finances.bouwdepotSection.colDate")}</th>
                <th className="pb-2 pr-3 font-medium">{t("finances.unified.colStatus")}</th>
                <th className="pb-2 font-medium">
                  <span className="sr-only">{t("finances.unified.colActions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((regel) => (
                <tr
                  key={regel.id}
                  data-testid="bouwdepot-row"
                  data-bouwdepot-type={regel.type}
                  data-bouwdepot-status={regel.status}
                  className="group border-b border-renovation-border/80"
                >
                  <td className="py-2.5 pr-3 font-medium text-foreground">{regel.omschrijving}</td>
                  <td className="hidden py-2.5 pr-3 sm:table-cell">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(regel.type)}`}>
                      {typeLabel(t, regel.type)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-foreground">
                    {formatCurrency(regel.bedrag)}
                  </td>
                  <td className="hidden py-2.5 pr-3 text-renovation-concrete md:table-cell">
                    {regel.datum ? formatDisplayDate(regel.datum) : t("common.emDash")}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(regel)}`}>
                      {statusLabel(t, regel)}
                    </span>
                  </td>
                  <td className="py-2.5">
                    {regel.editable ? (
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button
                          type="button"
                          data-testid="bouwdepot-declaratie-edit"
                          aria-label={t("common.edit")}
                          className="rounded-md p-1.5 text-renovation-concrete transition-colors hover:bg-renovation-muted hover:text-foreground"
                          onClick={() => openEdit(regel.source_id as ID)}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          data-testid="bouwdepot-declaratie-delete"
                          aria-label={t("common.delete")}
                          className="rounded-md p-1.5 text-renovation-concrete transition-colors hover:bg-renovation-muted hover:text-red-600 dark:hover:text-red-400"
                          onClick={() => void handleDelete(regel.source_id as ID)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <KostenBewerkModal
        project={project}
        open={modalOpen}
        type="declaratie"
        declaratieId={editingId}
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}
