"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { formatCurrency } from "@/lib/format/currency";

type Props = {
  total: number;
  declared: number;
  remaining: number;
  declaredPct: number;
  manageHref: string | null;
  emptyHint: string;
};

export default function BouwdepotDeclaratieCard({
  total,
  declared,
  remaining,
  declaredPct,
  manageHref,
  emptyHint,
}: Props) {
  const { t } = useI18n();
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const safeDeclared = Number.isFinite(declared) ? Math.max(0, declared) : 0;
  const safeRemaining = Number.isFinite(remaining) ? remaining : 0;
  const safePct = safeTotal > 0 ? Math.min(100, Math.max(0, declaredPct)) : 0;
  const hasCap = safeTotal > 0;

  return (
    <article
      data-testid="bouwdepot-declaratie-card"
      className="flex flex-col rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated"
    >
      <h3 className="text-sm font-semibold text-foreground">{t("bouwdepot.cardTitle")}</h3>
      <p
        data-testid="bouwdepot-declaratie-remaining"
        className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground"
      >
        {formatCurrency(hasCap ? safeRemaining : 0)}
      </p>
      <p className="mt-1 text-xs text-renovation-concrete">
        {hasCap
          ? t("bouwdepotDeclaraties.declaredOfTotal", {
              declared: formatCurrency(safeDeclared),
              total: formatCurrency(safeTotal),
            })
          : emptyHint}
      </p>
      {hasCap ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-renovation-muted">
          <div
            data-testid="bouwdepot-declaratie-progress"
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${safePct}%` }}
          />
        </div>
      ) : null}
      {manageHref ? (
        <Link
          href={manageHref}
          data-testid="bouwdepot-declaratie-manage-link"
          className="mt-3 inline-block text-xs font-medium text-renovation-steel hover:underline dark:text-renovation-accent"
        >
          {t("bouwdepotDeclaraties.manageLink")}
        </Link>
      ) : null}
    </article>
  );
}
