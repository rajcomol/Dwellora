"use client";

// TODO: verwijderen na opruiming — vervangen door kostenposten in Financiën

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import BouwdepotDeclaratieModal from "@/components/settings/BouwdepotDeclaratieModal";
import { useI18n } from "@/i18n/provider";
import { computeBouwdepotUsage } from "@/lib/dashboard/bouwdepot";
import { computeDeclaratieTotals, declaratieStatusBadgeClass } from "@/lib/dashboard/bouwdepotDeclaraties";
import { projectMoney } from "@/lib/dashboard/projectBudget";
import { formatCurrency } from "@/lib/format/currency";
import type { BouwdepotDeclaratie, ID } from "@/lib/renovation/types";

function formatDeclDate(value: string | null): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function BouwdepotDeclaratiesSection({ projectId }: { projectId: ID }) {
  const { t } = useI18n();
  const { projects, declaraties, tasks, projectExpenses } = useRenovation();
  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BouwdepotDeclaratie | null>(null);

  const projectDeclaraties = useMemo(
    () =>
      [...(declaraties ?? [])]
        .filter((d) => d.projectId === projectId)
        .sort((a, b) => b.aangemaaktOp.localeCompare(a.aangemaaktOp)),
    [declaraties, projectId]
  );

  const totals = useMemo(
    () => computeDeclaratieTotals(declaraties ?? [], projectId),
    [declaraties, projectId]
  );

  const depotUsage = useMemo(() => {
    if (!project) return null;
    return computeBouwdepotUsage(project, projectExpenses);
  }, [project, tasks, projectExpenses, declaraties]);

  if (!project) return null;

  const depotTotal = projectMoney(project).depot;
  const gedeclareerd = depotUsage?.usedAmount ?? 0;
  const resterend = depotUsage?.remainingAmount ?? depotTotal;
  const declaredPct = depotUsage?.percentageUsed ?? 0;

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(decl: BouwdepotDeclaratie) {
    setEditing(decl);
    setModalOpen(true);
  }

  return (
    <section
      data-testid="bouwdepot-declaraties-section"
      className="space-y-4 rounded-xl border border-renovation-border bg-renovation-elevated p-5 dark:border-renovation-border dark:bg-renovation-elevated"
    >
      <header>
        <h2 className="text-lg font-semibold text-foreground">{t("bouwdepotDeclaraties.sectionTitle")}</h2>
        <p className="mt-1 text-sm text-renovation-concrete">{t("bouwdepotDeclaraties.sectionHint")}</p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div
          data-testid="declaratie-stat-totaal"
          className="rounded-lg border border-renovation-border bg-renovation-muted/40 p-3 dark:bg-renovation-muted/20"
        >
          <p className="text-xs font-medium text-renovation-concrete">{t("bouwdepotDeclaraties.statTotal")}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{formatCurrency(depotTotal)}</p>
        </div>
        <div
          data-testid="declaratie-stat-gedeclareerd"
          className="rounded-lg border border-renovation-border bg-renovation-muted/40 p-3 dark:bg-renovation-muted/20"
        >
          <p className="text-xs font-medium text-renovation-concrete">{t("bouwdepotDeclaraties.statDeclared")}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{formatCurrency(gedeclareerd)}</p>
        </div>
        <div
          data-testid="declaratie-stat-resterend"
          className="rounded-lg border border-renovation-border bg-renovation-muted/40 p-3 dark:bg-renovation-muted/20"
        >
          <p className="text-xs font-medium text-renovation-concrete">{t("bouwdepotDeclaraties.statRemaining")}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{formatCurrency(resterend)}</p>
        </div>
      </div>

      {depotTotal > 0 ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-renovation-muted">
          <div
            data-testid="declaratie-progress-bar"
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${declaredPct}%` }}
          />
        </div>
      ) : null}

      <ul className="divide-y divide-renovation-border rounded-lg border border-renovation-border">
        {projectDeclaraties.length === 0 ? (
          <li className="p-4 text-sm text-renovation-concrete">{t("bouwdepotDeclaraties.empty")}</li>
        ) : (
          projectDeclaraties.map((decl) => (
            <li
              key={decl.id}
              data-testid="declaratie-row"
              data-declaratie-id={decl.id}
              data-declaratie-status={decl.status}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{decl.omschrijving}</p>
                {decl.ingediendOp ? (
                  <p className="text-xs text-renovation-concrete">
                    {t("bouwdepotDeclaraties.submittedOn", { date: formatDeclDate(decl.ingediendOp) })}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(decl.bedrag)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${declaratieStatusBadgeClass(decl.status)}`}
                >
                  {t(`bouwdepotDeclaraties.status.${decl.status}`)}
                </span>
                <Button type="button" variant="secondary" onClick={() => openEdit(decl)}>
                  {t("common.edit")}
                </Button>
              </div>
            </li>
          ))
        )}
      </ul>

      <Button type="button" data-testid="declaratie-add-button" onClick={openCreate}>
        {t("bouwdepotDeclaraties.addButton")}
      </Button>

      <BouwdepotDeclaratieModal
        project={project}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        declaratie={editing}
      />
    </section>
  );
}
