"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CreateDepotModal from "@/components/dashboard/CreateDepotModal";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { depotProgressColorClass } from "@/lib/dashboard/projectBudget";
import { formatCurrency } from "@/lib/format/currency";
import { appendProjectQuery } from "@/components/layout/tab-nav-config";

export default function BouwdepotDashboardCard() {
  const { t } = useI18n();
  const { selectedProject, selectedProjectId } = useSelectedProject();
  const { constructionDepotBalances } = useRenovation();
  const [modalOpen, setModalOpen] = useState(false);

  const depots = useMemo(() => {
    if (!selectedProjectId) return [];
    return constructionDepotBalances.filter((d) => d.projectId === selectedProjectId);
  }, [constructionDepotBalances, selectedProjectId]);

  const projectDepotTotal = selectedProject?.constructionDepotTotal ?? 0;

  return (
    <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-renovation-steel dark:text-zinc-200">
            {t("bouwdepot.cardTitle")}
          </h2>
          <p className="mt-1 text-xs text-renovation-concrete">{t("bouwdepot.cardHint")}</p>
        </div>
        {selectedProjectId ? (
          <Button type="button" variant="secondary" onClick={() => setModalOpen(true)}>
            {t("bouwdepot.newDepot")}
          </Button>
        ) : null}
      </div>

      {!selectedProjectId ? (
        <p className="mt-4 text-sm text-renovation-concrete">{t("layout.topBar.chooseProject")}</p>
      ) : depots.length === 0 ? (
        <div className="mt-4">
          <p className="text-sm text-renovation-concrete">{t("constructionDepot.noDepots")}</p>
          <Button type="button" className="mt-3" onClick={() => setModalOpen(true)}>
            {t("bouwdepot.newDepot")}
          </Button>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {depots.map((d) => {
            const cap = d.projectDepotTotal > 0 ? d.projectDepotTotal : projectDepotTotal;
            const pct = cap > 0 ? Math.min(100, d.percentageUsed) : 0;
            return (
              <li key={d.id} className="rounded-lg border border-renovation-border/80 p-3 dark:border-renovation-border">
                <div className="font-medium text-zinc-900 dark:text-zinc-50">{d.name}</div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full transition-all ${depotProgressColorClass(pct)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-renovation-concrete">
                  {t("bouwdepot.progress.usedOfTotal", {
                    spent: formatCurrency(d.spentEstimated),
                    total: formatCurrency(cap),
                  })}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {selectedProjectId ? (
        <Link
          href={appendProjectQuery("/dashboard/bouwdepot", selectedProjectId)}
          className="mt-4 inline-block text-xs font-medium text-renovation-steel hover:underline dark:text-renovation-accent"
        >
          {t("bouwdepot.viewAll")}
        </Link>
      ) : null}

      {selectedProjectId ? (
        <CreateDepotModal projectId={selectedProjectId} open={modalOpen} onClose={() => setModalOpen(false)} />
      ) : null}
    </section>
  );
}
