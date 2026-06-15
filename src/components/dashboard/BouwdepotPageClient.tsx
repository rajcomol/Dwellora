"use client";

import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import Link from "next/link";
import { formatCurrency } from "@/lib/format/currency";
import { depotProgressColorClass } from "@/lib/dashboard/projectBudget";

export default function BouwdepotPageClient() {
  const { t } = useI18n();
  const { selectedProjectId, selectedProject } = useSelectedProject();
  const { isRenovationDataReady, projectConstructionDepotBalances } = useRenovation();

  if (!isRenovationDataReady) {
    return <DashboardPageSkeleton />;
  }

  const balance = selectedProjectId
    ? projectConstructionDepotBalances.find((b) => b.projectId === selectedProjectId)
    : null;
  const total = balance?.totalAmount ?? 0;
  const used = balance?.usedAmount ?? 0;
  const pct = total > 0 ? Math.min(100, balance?.percentageUsed ?? 0) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("nav.tabs.bouwdepot")}</h1>
        <p className="mt-1 text-sm text-renovation-concrete">
          {selectedProject
            ? t("bouwdepot.pageSubtitle", { name: selectedProject.name })
            : t("layout.topBar.chooseProject")}
        </p>
      </div>

      {selectedProjectId && selectedProject ? (
        <>
          <div className="rounded-xl border border-renovation-border bg-renovation-elevated p-4 dark:border-renovation-border dark:bg-renovation-elevated">
            <p className="text-xs text-renovation-concrete">{t("budget.depotTotal")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(total)}</p>
            {total <= 0 ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                {t("bouwdepot.noProjectTotalWarning")}
              </p>
            ) : (
              <>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-renovation-muted">
                  <div
                    className={`h-full rounded-full transition-all ${depotProgressColorClass(pct)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-renovation-concrete">
                  {t("bouwdepot.progress.usedOfTotal", {
                    spent: formatCurrency(used),
                    total: formatCurrency(total),
                  })}
                </p>
                <p className="mt-1 text-xs text-renovation-concrete">
                  {t("constructionDepot.remaining")}: {formatCurrency(balance?.remainingAmount ?? 0)}
                </p>
              </>
            )}
            <Link
              href={`/dashboard/projects/${selectedProjectId}/settings`}
              className="mt-2 inline-block text-xs font-medium underline"
            >
              {t("bouwdepot.editBudgetSettings")}
            </Link>
          </div>
        </>
      ) : (
        <p className="text-sm text-renovation-concrete">{t("layout.topBar.chooseProject")}</p>
      )}
    </div>
  );
}
