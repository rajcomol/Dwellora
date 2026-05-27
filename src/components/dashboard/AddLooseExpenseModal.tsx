"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import { projectMoney } from "@/lib/dashboard/projectBudget";
import type { ID, Project } from "@/lib/renovation/types";
import { z } from "zod";

const FORM_LABEL = "mb-1 block text-xs font-medium text-renovation-concrete";

const looseExpenseSchema = z.object({
  title: z.string().trim().min(1),
  amount: z
    .string()
    .transform((s) => (s.trim() === "" ? NaN : Number.parseFloat(s)))
    .pipe(z.number().finite().min(0)),
  spentOn: z.string(),
  notes: z.string(),
});

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  project: Project;
  open: boolean;
  onClose: () => void;
};

export default function AddLooseExpenseModal({ project, open, onClose }: Props) {
  const { t } = useI18n();
  const { createProjectExpense } = useRenovation();
  const hasDepot = projectMoney(project).depot > 0;

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [spentOn, setSpentOn] = useState(todayIso);
  const [notes, setNotes] = useState("");
  const [fundedByDepot, setFundedByDepot] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setAmount("");
    setSpentOn(todayIso());
    setNotes("");
    setFundedByDepot(false);
    setError(null);
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = looseExpenseSchema.safeParse({ title, amount, spentOn, notes });
    if (!parsed.success) {
      setError(t("dashboard.looseExpenses.formError"));
      return;
    }
    createProjectExpense({
      projectId: project.id as ID,
      title: parsed.data.title,
      amount: parsed.data.amount,
      spentOn: parsed.data.spentOn.trim() || null,
      notes: parsed.data.notes.trim(),
      fundedByConstructionDepot: hasDepot && fundedByDepot,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t("common.cancel")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Uitgave toevoegen"
        aria-labelledby="add-loose-expense-title"
        className="relative z-10 w-full max-w-md rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated"
      >
        <h2 id="add-loose-expense-title" className="text-lg font-semibold text-foreground">
          {t("dashboard.looseExpenses.addTitle")}
        </h2>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="loose-exp-title" className={FORM_LABEL}>
              {t("dashboard.looseExpenses.labelDescription")}
            </label>
            <input
              id="loose-exp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
          <div>
            <label htmlFor="loose-exp-amount" className={FORM_LABEL}>
              {t("dashboard.looseExpenses.labelAmount")}
            </label>
            <input
              id="loose-exp-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
          <div>
            <label htmlFor="loose-exp-date" className={FORM_LABEL}>
              {t("dashboard.looseExpenses.labelDate")}
            </label>
            <input
              id="loose-exp-date"
              type="date"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
              className="w-full rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
          {hasDepot ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fundedByDepot}
                onChange={(e) => setFundedByDepot(e.target.checked)}
                className="rounded border-renovation-border"
              />
              {t("dashboard.looseExpenses.fundedByDepot")}
            </label>
          ) : null}
          <div>
            <label htmlFor="loose-exp-notes" className={FORM_LABEL}>
              {t("dashboard.looseExpenses.labelNotes")}
            </label>
            <textarea
              id="loose-exp-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>

          {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">{t("common.save")}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
