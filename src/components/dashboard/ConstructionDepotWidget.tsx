"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import { formatCurrency } from "@/lib/format/currency";

export default function ConstructionDepotWidget() {
  const { t } = useI18n();
  const { projects, constructionDepotBalances } = useRenovation();

  const active = useMemo(
    () => constructionDepotBalances.filter((d) => d.totalAmount > 0 || d.linkedTaskCount > 0),
    [constructionDepotBalances]
  );

  const projectNameById = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  if (active.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-renovation-steel dark:text-zinc-200">
        {t("constructionDepot.dashboardTitle")}
      </h2>
      <p className="mt-1 text-xs text-renovation-concrete">{t("constructionDepot.dashboardHint")}</p>
      <ul className="mt-4 space-y-3">
        {active.map((d) => {
          const pct = d.totalAmount > 0 ? Math.min(100, (d.spentEstimated / d.totalAmount) * 100) : 0;
          const over = d.remainingEstimated < 0;
          return (
            <li
              key={d.id}
              className="rounded-xl border border-renovation-border bg-renovation-elevated p-4 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">{d.name}</div>
                  <div className="mt-0.5 text-xs text-renovation-concrete">
                    {projectNameById.get(d.projectId) ?? "—"}
                  </div>
                </div>
                <Link
                  href={`/dashboard/projects/${d.projectId}#bouwdepots`}
                  className="text-xs font-medium text-renovation-steel hover:underline dark:text-renovation-accent"
                >
                  {t("constructionDepot.viewProject")}
                </Link>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={[
                    "h-full rounded-full transition-all",
                    over ? "bg-red-500" : "bg-renovation-accent",
                  ].join(" ")}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <span>
                  {t("constructionDepot.spent")}: {formatCurrency(d.spentEstimated)}
                </span>
                <span>
                  {t("constructionDepot.remaining")}:{" "}
                  <span className={over ? "font-medium text-red-600 dark:text-red-400" : ""}>
                    {formatCurrency(d.remainingEstimated)}
                  </span>
                </span>
                <span>
                  {t("constructionDepot.ofTotal", { total: formatCurrency(d.totalAmount) })}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
