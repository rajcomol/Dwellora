"use client";

import { useMemo, useState } from "react";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useI18n } from "@/i18n/provider";
import { formatCurrency } from "@/lib/format/currency";
import { constructionDepotNameSchema } from "@/lib/validation/schemas";
import { depotProgressColorClass } from "@/lib/dashboard/projectBudget";
import type { ID } from "@/lib/renovation/types";

export default function ConstructionDepotsSection({ projectId }: { projectId: ID }) {
  const { t } = useI18n();
  const {
    constructionDepots,
    constructionDepotBalances,
    createConstructionDepot,
    updateConstructionDepot,
    deleteConstructionDepot,
  } = useRenovation();

  const depots = useMemo(
    () => constructionDepots.filter((d) => d.projectId === projectId),
    [constructionDepots, projectId]
  );
  const balances = useMemo(
    () => constructionDepotBalances.filter((d) => d.projectId === projectId),
    [constructionDepotBalances, projectId]
  );
  const balanceById = useMemo(() => new Map(balances.map((b) => [b.id, b])), [balances]);

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <div id="bouwdepots" className="scroll-mt-6">
      <h2 className="text-lg font-semibold">{t("constructionDepot.sectionTitle")}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("constructionDepot.sectionHint")}</p>

      {depots.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">{t("constructionDepot.noDepots")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {depots.map((d) => {
            const bal = balanceById.get(d.id);
            const spent = bal?.spentEstimated ?? 0;
            const cap = bal?.projectDepotTotal ?? 0;
            const remaining = bal?.remainingEstimated ?? 0;
            const pct = bal?.percentageUsed ?? 0;
            return (
              <li
                key={d.id}
                className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="font-medium">{d.name}</div>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                    onClick={() => {
                      if (typeof window !== "undefined" && window.confirm(t("constructionDepot.deleteConfirm"))) {
                        deleteConstructionDepot(d.id);
                      }
                    }}
                  >
                    {t("common.delete")}
                  </button>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${depotProgressColorClass(pct)}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  {t("bouwdepot.progress.usedOfTotal", {
                    spent: formatCurrency(spent),
                    total: formatCurrency(cap),
                  })}{" "}
                  • {t("constructionDepot.remaining")}: {formatCurrency(remaining)}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = constructionDepotNameSchema.safeParse({ name });
          if (!parsed.success) {
            setError(t("constructionDepot.formError"));
            return;
          }
          createConstructionDepot({
            projectId,
            name: parsed.data.name,
          });
          setName("");
          setError(null);
        }}
      >
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {t("constructionDepot.nameLabel")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
        </div>
        <Button type="submit">{t("constructionDepot.create")}</Button>
      </form>
      {error ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      </div>
    </Card>
  );
}
