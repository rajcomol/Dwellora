"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import { formatCurrency } from "@/lib/format/currency";
import { depotProgressColorClass } from "@/lib/dashboard/projectBudget";

export default function ConstructionDepotWidget() {
  const { t } = useI18n();
  const { projects, projectConstructionDepotBalances } = useRenovation();

  const active = useMemo(
    () =>
      projectConstructionDepotBalances.filter(
        (b) => b.totalAmount > 0 || b.linkedTaskCount > 0
      ),
    [projectConstructionDepotBalances]
  );

  const projectNameById = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  if (active.length === 0) return null;

  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">{t("constructionDepot.dashboardTitle")}</h2>
      <p className="mt-1 text-xs text-renovation-concrete">{t("constructionDepot.dashboardHint")}</p>
      <ul className="mt-4 space-y-3">
        {active.map((b) => {
          const pct = b.totalAmount > 0 ? Math.min(100, b.percentageUsed) : 0;
          const over = b.remainingAmount < 0;
          return (
            <li
              key={b.projectId}
              className="rounded-xl border border-renovation-border bg-renovation-elevated p-4 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="font-medium text-foreground">{projectNameById.get(b.projectId) ?? "—"}</div>
                <Link
                  href={`/dashboard/bouwdepot?project=${b.projectId}`}
                  className="text-xs font-medium text-renovation-steel hover:underline dark:text-renovation-accent"
                >
                  {t("constructionDepot.viewProject")}
                </Link>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-renovation-muted">
                <div
                  className={`h-full rounded-full transition-all ${over ? "bg-red-500" : depotProgressColorClass(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-renovation-concrete">
                <span>
                  {t("constructionDepot.used")}: {formatCurrency(b.usedAmount)}
                </span>
                <span>
                  {t("constructionDepot.remaining")}:{" "}
                  <span className={over ? "font-medium text-red-600 dark:text-red-400" : ""}>
                    {formatCurrency(b.remainingAmount)}
                  </span>
                </span>
                <span>{t("constructionDepot.ofTotal", { total: formatCurrency(b.totalAmount) })}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
