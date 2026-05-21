"use client";

import { useEffect, useMemo, useState } from "react";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { formatCurrency } from "@/lib/format/currency";
import { projectUpdateFormSchema } from "@/lib/validation/schemas";
import type { ID } from "@/lib/renovation/types";

function nullableBudgetInput(value: number | null): string {
  return value == null ? "" : String(value);
}

export default function ProjectSettingsForm({ projectId }: { projectId: ID }) {
  const { t } = useI18n();
  const { projects, updateProject } = useRenovation();
  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);

  const [name, setName] = useState("");
  const [ownContribution, setOwnContribution] = useState("");
  const [constructionDepotTotal, setConstructionDepotTotal] = useState("");
  const [address, setAddress] = useState("");
  const [expectedKeyHandover, setExpectedKeyHandover] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setOwnContribution(nullableBudgetInput(project.ownContribution));
    setConstructionDepotTotal(nullableBudgetInput(project.constructionDepotTotal));
    setAddress(project.address);
    setExpectedKeyHandover(project.expectedKeyHandover ?? "");
    setNotes(project.notes);
  }, [project]);

  const computedTotal = useMemo(() => {
    const own = ownContribution.trim() === "" ? 0 : Number.parseFloat(ownContribution) || 0;
    const depot = constructionDepotTotal.trim() === "" ? 0 : Number.parseFloat(constructionDepotTotal) || 0;
    return own + depot;
  }, [ownContribution, constructionDepotTotal]);

  if (!project) {
    return null;
  }

  const fieldLabel = "mb-1 block text-xs font-medium text-renovation-concrete";

  return (
    <form
      className="space-y-4 rounded-xl border border-renovation-border bg-renovation-elevated p-5 dark:border-renovation-border dark:bg-renovation-elevated"
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = projectUpdateFormSchema.safeParse({
          name,
          ownContribution,
          constructionDepotTotal,
          address,
          expectedKeyHandover,
          notes,
        });
        if (!parsed.success) {
          setError(t("validation.generic"));
          return;
        }
        updateProject({
          id: projectId,
          name: parsed.data.name,
          ownContribution: parsed.data.ownContribution,
          constructionDepotTotal: parsed.data.constructionDepotTotal,
          address: parsed.data.address.trim(),
          expectedKeyHandover: parsed.data.expectedKeyHandover.trim() || null,
          notes: parsed.data.notes.trim(),
        });
        setError(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }}
    >
      <div>
        <label className={fieldLabel}>{t("projects.labelName")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-muted/30"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={fieldLabel}>{t("budget.ownMoney")}</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={ownContribution}
            onChange={(e) => setOwnContribution(e.target.value)}
            className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-muted/30"
          />
        </div>
        <div>
          <label className={fieldLabel}>{t("budget.depotTotal")}</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={constructionDepotTotal}
            onChange={(e) => setConstructionDepotTotal(e.target.value)}
            className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-muted/30"
          />
        </div>
      </div>
      <p className="text-sm text-renovation-concrete">
        {t("budget.totalReadOnly")}: <strong>{formatCurrency(computedTotal)}</strong>
      </p>
      <div>
        <label className={fieldLabel}>{t("projects.labelAddress")}</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-muted/30"
        />
      </div>
      <div>
        <label className={fieldLabel}>{t("projects.labelKeyHandover")}</label>
        <input
          type="date"
          value={expectedKeyHandover}
          onChange={(e) => setExpectedKeyHandover(e.target.value)}
          className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-muted/30"
        />
      </div>
      <div>
        <label className={fieldLabel}>{t("projects.labelNotes")}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-muted/30"
        />
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {saved ? <p className="text-xs text-emerald-600">{t("common.saved")}</p> : null}
      <Button type="submit">{t("common.save")}</Button>
    </form>
  );
}
