"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AddLooseExpenseModal from "@/components/dashboard/AddLooseExpenseModal";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import { formatCurrency } from "@/lib/format/currency";
import { formatDisplayDate } from "@/lib/format/dateDisplay";

export default function LooseExpensesSection() {
  const { t } = useI18n();
  const { selectedProject, selectedProjectId } = useSelectedProject();
  const { projects, projectExpenses } = useRenovation();
  const [modalOpen, setModalOpen] = useState(false);

  const project = selectedProject ?? projects[0] ?? null;

  const recentExpenses = useMemo(() => {
    if (!project) return [];
    return projectExpenses
      .filter((e) => e.projectId === project.id)
      .sort((a, b) => {
        const da = a.spentOn ?? a.createdAt;
        const db = b.spentOn ?? b.createdAt;
        return db.localeCompare(da);
      })
      .slice(0, 3);
  }, [project, projectExpenses]);

  if (!project) {
    return null;
  }

  const financesHref = selectedProjectId
    ? `/dashboard/projects/${selectedProjectId}/finances`
    : `/dashboard/projects/${project.id}/finances`;

  return (
    <>
      <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-foreground">{t("dashboard.looseExpenses.title")}</h2>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-renovation-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-renovation-steel"
          >
            {t("dashboard.looseExpenses.addButton")}
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <p className="mt-4 text-sm text-renovation-concrete">{t("dashboard.looseExpenses.empty")}</p>
        ) : (
          <ul className="mt-4">
            {recentExpenses.map((expense, index) => {
              const dateLabel = expense.spentOn
                ? formatDisplayDate(expense.spentOn)
                : formatDisplayDate(expense.createdAt.slice(0, 10));
              return (
                <li
                  key={expense.id}
                  className={[
                    "flex items-start justify-between gap-3 py-3",
                    index < recentExpenses.length - 1
                      ? "border-b border-renovation-border dark:border-renovation-border"
                      : "",
                  ].join(" ")}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{expense.title}</p>
                    <p className="mt-0.5 text-xs text-renovation-concrete">{dateLabel}</p>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums text-foreground">
                    {formatCurrency(expense.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <Link
          href={financesHref}
          className="mt-4 inline-block text-xs font-medium text-renovation-steel hover:underline dark:text-renovation-accent"
        >
          {t("dashboard.looseExpenses.viewAll")}
        </Link>
      </section>

      <AddLooseExpenseModal project={project} open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
