"use client";

import { useMemo, useState } from "react";
import KostenBewerkModal from "@/components/dashboard/KostenBewerkModal";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { bouwdepotRemainingAmountClass, computeBouwdepotUsage } from "@/lib/dashboard/bouwdepot";
import { formatCurrency } from "@/lib/format/currency";
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import { mergeBouwdepotItems, type BouwdepotRegel } from "@/lib/mergeBouwdepotItems";
import type { BouwdepotStatus, ID, Project } from "@/lib/renovation/types";

function statusLabel(t: (key: string) => string, status: BouwdepotStatus): string {
  if (status === "ingediend") return t("finances.unified.statusIngediend");
  if (status === "uitbetaald") return t("finances.unified.statusUitbetaald");
  return t("finances.unified.statusOpen");
}

type Props = {
  project: Project;
  projectId: ID;
};

export default function BouwdepotSectie({ project, projectId }: Props) {
  const { t } = useI18n();
  const { projectExpenses, updateProjectExpense } = useRenovation();
  const [modalOpen, setModalOpen] = useState(false);

  const projectExpensesFiltered = useMemo(
    () => projectExpenses.filter((e) => e.projectId === projectId),
    [projectExpenses, projectId]
  );

  const usage = useMemo(
    () => computeBouwdepotUsage(project, projectExpensesFiltered),
    [project, projectExpensesFiltered]
  );

  const rows = useMemo(
    () => mergeBouwdepotItems(projectId, projectExpensesFiltered),
    [projectId, projectExpensesFiltered]
  );

  function openAdd() {
    setModalOpen(true);
  }

  function handleStatusChange(regel: BouwdepotRegel, status: BouwdepotStatus) {
    updateProjectExpense({ id: regel.source_id as ID, bouwdepotStatus: status });
  }

  return (
    <section
      data-testid="finances-bouwdepot-section"
      className="space-y-4 rounded-xl border border-renovation-border bg-renovation-surface p-4 shadow-renovation-card sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{t("finances.bouwdepotSection.title")}</h2>
        <Button type="button" data-testid="bouwdepot-add-expense" onClick={openAdd}>
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
            {formatCurrency(usage.ingediend)}
          </p>
        </div>
        <div
          data-testid="bouwdepot-stat-uitbetaald"
          className="rounded-lg border border-renovation-border bg-renovation-elevated px-4 py-3"
        >
          <p className="text-xs font-medium text-renovation-concrete">{t("finances.bouwdepotSection.statPaid")}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(usage.uitbetaald)}
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
                <th className="pb-2 pr-3 text-right font-medium">{t("finances.unified.colAmount")}</th>
                <th className="hidden pb-2 pr-3 font-medium md:table-cell">{t("finances.bouwdepotSection.colDate")}</th>
                <th className="pb-2 pr-3 font-medium">{t("finances.unified.colStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((regel) => (
                <tr
                  key={regel.id}
                  data-testid="bouwdepot-row"
                  data-bouwdepot-status={regel.bouwdepotStatus}
                  className="border-b border-renovation-border/80"
                >
                  <td className="py-2.5 pr-3 font-medium text-foreground">{regel.omschrijving}</td>
                  <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-foreground">
                    {formatCurrency(regel.bedrag)}
                  </td>
                  <td className="hidden py-2.5 pr-3 text-renovation-concrete md:table-cell">
                    {regel.datum ? formatDisplayDate(regel.datum) : t("common.emDash")}
                  </td>
                  <td className="py-2.5 pr-3">
                    <select
                      data-testid="bouwdepot-status-select"
                      aria-label={t("finances.unified.colStatus")}
                      value={regel.bouwdepotStatus}
                      onChange={(e) => handleStatusChange(regel, e.target.value as BouwdepotStatus)}
                      className="rounded-lg border border-renovation-border bg-renovation-surface px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-renovation-accent/40"
                    >
                      <option value="open">{statusLabel(t, "open")}</option>
                      <option value="ingediend">{statusLabel(t, "ingediend")}</option>
                      <option value="uitbetaald">{statusLabel(t, "uitbetaald")}</option>
                    </select>
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
        defaultDepotChecked
        onClose={() => setModalOpen(false)}
      />
    </section>
  );
}
