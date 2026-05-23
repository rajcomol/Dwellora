"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import {
  budgetSourceStatusAmountClass,
  budgetSourceStatusBarClass,
  budgetSourceStatusTrackClass,
  getBudgetSourceStatus,
} from "@/lib/dashboard/budgetSourceStatus";
import { formatCurrency } from "@/lib/format/currency";

type Props = {
  title: string;
  total: number;
  used: number;
  remaining: number;
  usedPct: number;
  manageHref: string | null;
  emptyHint: string;
};

export default function BudgetSourceCard({
  title,
  total,
  used,
  remaining,
  usedPct,
  manageHref,
  emptyHint,
}: Props) {
  const { t } = useI18n();
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const safeUsed = Number.isFinite(used) ? Math.max(0, used) : 0;
  const safeRemaining = Number.isFinite(remaining) ? remaining : 0;
  const safeUsedPct = safeTotal > 0 ? Math.min(100, Math.max(0, usedPct)) : 0;

  const status = getBudgetSourceStatus(safeRemaining, safeTotal);
  const hasCap = safeTotal > 0;

  return (
    <article className="flex flex-col rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p
        className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${
          hasCap ? budgetSourceStatusAmountClass(status) : "text-foreground"
        }`}
      >
        {formatCurrency(hasCap ? safeRemaining : 0)}
      </p>
      <p className="mt-1 text-xs text-renovation-concrete">
        {hasCap
          ? t("bouwdepot.progress.usedOfTotal", {
              spent: formatCurrency(safeUsed),
              total: formatCurrency(safeTotal),
            })
          : emptyHint}
      </p>
      {hasCap ? (
        <div className={`mt-3 h-1.5 overflow-hidden rounded-full ${budgetSourceStatusTrackClass(status)}`}>
          <div
            className={`h-full rounded-full transition-all ${budgetSourceStatusBarClass(status)}`}
            style={{ width: `${safeUsedPct}%` }}
          />
        </div>
      ) : null}
      {manageHref ? (
        <Link
          href={manageHref}
          className="mt-3 inline-block text-xs font-medium text-renovation-steel hover:underline dark:text-renovation-accent"
        >
          {t("dashboard.budget.manage")}
        </Link>
      ) : null}
    </article>
  );
}
