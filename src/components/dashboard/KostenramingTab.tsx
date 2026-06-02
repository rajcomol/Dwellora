"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import Button from "@/components/ui/Button";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useI18n } from "@/i18n/provider";
import {
  buildKostenramingData,
  downloadKostenramingCsv,
  type KostenramingCategory,
  type KostenramingDeclaratieLine,
  type KostenramingExpenseLine,
  type KostenramingTaskLine,
} from "@/lib/finances/kostenraming";
import { formatCurrency } from "@/lib/format/currency";

function CostAmount({
  amount,
  costType,
  actualLabel,
  estimatedLabel,
}: {
  amount: number;
  costType: "werkelijk" | "geschat";
  actualLabel: string;
  estimatedLabel: string;
}) {
  const isActual = costType === "werkelijk";
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span
        className={`text-sm font-semibold tabular-nums ${isActual ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}
      >
        {formatCurrency(amount)}
      </span>
      <span className="rounded-md bg-renovation-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-renovation-concrete">
        {isActual ? actualLabel : estimatedLabel}
      </span>
    </div>
  );
}

function TaskRow({
  item,
  actualLabel,
  estimatedLabel,
}: {
  item: KostenramingTaskLine;
  actualLabel: string;
  estimatedLabel: string;
}) {
  return (
    <li className="flex items-start justify-between gap-3 border-t border-renovation-border/70 px-4 py-3 first:border-t-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        <p className="text-xs text-renovation-concrete">{item.roomName}</p>
      </div>
      <CostAmount
        amount={item.amount}
        costType={item.costType}
        actualLabel={actualLabel}
        estimatedLabel={estimatedLabel}
      />
    </li>
  );
}

function SimpleRow({
  title,
  amount,
  actualLabel,
}: {
  title: string;
  amount: number;
  actualLabel: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 border-t border-renovation-border/70 px-4 py-3 first:border-t-0">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <CostAmount amount={amount} costType="werkelijk" actualLabel={actualLabel} estimatedLabel={actualLabel} />
    </li>
  );
}

function CategorySection({
  category,
  expanded,
  onToggle,
  actualLabel,
  estimatedLabel,
}: {
  category: KostenramingCategory;
  expanded: boolean;
  onToggle: () => void;
  actualLabel: string;
  estimatedLabel: string;
}) {
  return (
    <section
      className="overflow-hidden rounded-xl border border-renovation-border bg-renovation-elevated shadow-renovation-card"
      data-testid={`kostenraming-category-${category.id}`}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-renovation-muted/40"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            <span aria-hidden>{category.icon}</span> {category.label}
          </p>
          <p className="text-xs text-renovation-concrete">
            {category.items.length} {category.items.length === 1 ? "item" : "items"}
          </p>
        </div>
        <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(category.subtotal)}</span>
      </button>
      {expanded ? (
        <ul className="border-t border-renovation-border bg-renovation-muted/20">
          {category.items.map((item) => (
            <TaskRow key={item.taskId} item={item} actualLabel={actualLabel} estimatedLabel={estimatedLabel} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ExtraSection({
  testId,
  title,
  countLabel,
  subtotal,
  expanded,
  onToggle,
  children,
}: {
  testId: string;
  title: string;
  countLabel: string;
  subtotal: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section
      className="overflow-hidden rounded-xl border border-renovation-border bg-renovation-elevated shadow-renovation-card"
      data-testid={testId}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-renovation-muted/40"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-renovation-concrete">{countLabel}</p>
        </div>
        <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(subtotal)}</span>
      </button>
      {expanded ? <ul className="border-t border-renovation-border bg-renovation-muted/20">{children}</ul> : null}
    </section>
  );
}

export default function KostenramingTab() {
  const { t } = useI18n();
  const { selectedProject, selectedProjectId } = useSelectedProject();
  const { projects, rooms, tasks, projectExpenses, declaraties } = useRenovation();

  const project = selectedProject ?? projects[0] ?? null;
  const projectId = selectedProjectId ?? project?.id ?? null;

  const data = useMemo(() => {
    if (!projectId) return null;
    return buildKostenramingData({
      projectId,
      tasks,
      rooms,
      projectExpenses,
      declaraties: declaraties ?? [],
    });
  }, [projectId, tasks, rooms, projectExpenses, declaraties]);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set());

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const actualLabel = t("finances.kostenraming.costTypeActual");
  const estimatedLabel = t("finances.kostenraming.costTypeEstimated");

  if (!projectId || !data) {
    return (
      <p className="text-sm text-renovation-concrete">{t("layout.topBar.chooseProject")}</p>
    );
  }

  const handleExport = () => {
    const safeName = (project?.name ?? "project").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
    downloadKostenramingCsv(data, `kostenraming-${safeName}.csv`);
  };

  return (
    <div className="space-y-4" data-testid="kostenraming-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("finances.kostenraming.title")}</h2>
          <p className="mt-1 text-xs text-renovation-concrete">{t("finances.kostenraming.subtitle")}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          data-testid="kostenraming-export"
          onClick={handleExport}
          disabled={!data.hasAnyCosts}
        >
          {t("finances.kostenraming.export")}
        </Button>
      </div>

      {!data.hasAnyCosts ? (
        <p className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 text-sm text-renovation-concrete shadow-renovation-card">
          {t("finances.kostenraming.empty")}
        </p>
      ) : (
        <div className="space-y-3 pb-28">
          {data.categories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              expanded={expandedSections.has(category.id)}
              onToggle={() => toggleSection(category.id)}
              actualLabel={actualLabel}
              estimatedLabel={estimatedLabel}
            />
          ))}

          {data.declaraties.length > 0 ? (
            <ExtraSection
              testId="kostenraming-declaraties"
              title={t("finances.kostenraming.declarationsTitle")}
              countLabel={t("finances.kostenraming.itemCount", { count: data.declaraties.length })}
              subtotal={data.declaraties.reduce((s, d) => s + d.amount, 0)}
              expanded={expandedSections.has("declaraties")}
              onToggle={() => toggleSection("declaraties")}
            >
              {data.declaraties.map((item: KostenramingDeclaratieLine) => (
                <SimpleRow key={item.declaratieId} title={item.title} amount={item.amount} actualLabel={actualLabel} />
              ))}
            </ExtraSection>
          ) : null}

          {data.looseExpenses.length > 0 ? (
            <ExtraSection
              testId="kostenraming-loose-expenses"
              title={t("finances.kostenraming.looseExpensesTitle")}
              countLabel={t("finances.kostenraming.itemCount", { count: data.looseExpenses.length })}
              subtotal={data.looseExpenses.reduce((s, e) => s + e.amount, 0)}
              expanded={expandedSections.has("loose-expenses")}
              onToggle={() => toggleSection("loose-expenses")}
            >
              {data.looseExpenses.map((item: KostenramingExpenseLine) => (
                <SimpleRow key={item.expenseId} title={item.title} amount={item.amount} actualLabel={actualLabel} />
              ))}
            </ExtraSection>
          ) : null}
        </div>
      )}

      <div
        data-testid="kostenraming-totals"
        className="sticky bottom-0 z-10 -mx-1 rounded-xl border border-renovation-border bg-renovation-elevated/95 p-4 shadow-renovation-card backdrop-blur-sm dark:bg-renovation-elevated/95"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-renovation-concrete">{t("finances.kostenraming.totalEstimated")}</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(data.totals.estimated)}</p>
          </div>
          <div>
            <p className="text-xs text-renovation-concrete">{t("finances.kostenraming.totalActual")}</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(data.totals.actual)}</p>
          </div>
          <div>
            <p className="text-xs text-renovation-concrete">{t("finances.kostenraming.totalExpected")}</p>
            <p className="text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {formatCurrency(data.totals.expected)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
