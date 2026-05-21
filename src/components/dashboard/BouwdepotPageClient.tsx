"use client";

import ConstructionDepotsSection from "@/components/dashboard/ConstructionDepotsSection";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import Link from "next/link";
import { formatCurrency } from "@/lib/format/currency";
import { projectMoney } from "@/lib/dashboard/projectBudget";

export default function BouwdepotPageClient() {
  const { t } = useI18n();
  const { selectedProjectId, selectedProject } = useSelectedProject();
  const { isRenovationDataReady } = useRenovation();

  if (!isRenovationDataReady) {
    return <DashboardPageSkeleton />;
  }

  const depotTotal = selectedProject ? projectMoney(selectedProject).depot : 0;

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
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatCurrency(depotTotal)}
            </p>
            {depotTotal <= 0 ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                {t("bouwdepot.noProjectTotalWarning")}
              </p>
            ) : null}
            <Link
              href={`/dashboard/projects/${selectedProjectId}/settings`}
              className="mt-2 inline-block text-xs font-medium underline"
            >
              {t("bouwdepot.editBudgetSettings")}
            </Link>
          </div>
          <ConstructionDepotsSection projectId={selectedProjectId} />
        </>
      ) : (
        <p className="text-sm text-renovation-concrete">{t("layout.topBar.chooseProject")}</p>
      )}
    </div>
  );
}
