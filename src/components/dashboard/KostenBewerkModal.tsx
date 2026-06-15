"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import { KOST_CATEGORIE_ORDER, categorieLabel } from "@/lib/finances/kostenraming";
import type { KostenRegel } from "@/lib/mergeKostenItems";
import { projectMoney } from "@/lib/dashboard/projectBudget";
import type { BouwdepotStatus, ID, KostCategorie, KostType, Project } from "@/lib/renovation/types";

const FORM_LABEL = "mb-1 block text-xs font-medium text-renovation-concrete";
const INPUT_CLASS =
  "w-full rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseNumber(value: string): number | null {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

type Props = {
  project: Project;
  open: boolean;
  regel?: KostenRegel | null;
  defaultDepotChecked?: boolean;
  onClose: () => void;
};

export default function KostenBewerkModal({
  project,
  open,
  regel = null,
  defaultDepotChecked = false,
  onClose,
}: Props) {
  const { t } = useI18n();
  const { projectExpenses, createProjectExpense, updateProjectExpense } = useRenovation();

  const isEdit = Boolean(regel);
  const hasDepot = projectMoney(project).depot > 0;

  const [omschrijving, setOmschrijving] = useState("");
  const [bedrag, setBedrag] = useState("");
  const [kostType, setKostType] = useState<KostType>("werkelijk");
  const [categorie, setCategorie] = useState<KostCategorie>("overig");
  const [datum, setDatum] = useState(todayIso);
  const [koppelDepot, setKoppelDepot] = useState(false);
  const [bouwdepotStatus, setBouwdepotStatus] = useState<BouwdepotStatus>("open");
  const [notities, setNotities] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (regel) {
      const expense = projectExpenses.find((e) => e.id === regel.source_id);
      setOmschrijving(expense?.title ?? regel.omschrijving);
      setBedrag(String(expense?.amount ?? regel.bedrag));
      setKostType(expense?.kostType ?? regel.kostType);
      setCategorie(expense?.categorie ?? regel.categorieId);
      setDatum(expense?.spentOn ?? regel.datum ?? todayIso());
      setKoppelDepot(expense?.fundedByConstructionDepot ?? regel.gekoppeld_aan_depot);
      setBouwdepotStatus(expense?.bouwdepotStatus ?? regel.bouwdepotStatus);
      setNotities(expense?.notes ?? "");
    } else {
      setOmschrijving("");
      setBedrag("");
      setKostType("werkelijk");
      setCategorie("overig");
      setDatum(todayIso());
      setKoppelDepot(defaultDepotChecked);
      setBouwdepotStatus("open");
      setNotities("");
    }
    setError(null);
  }, [open, regel, projectExpenses, defaultDepotChecked]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (!omschrijving.trim()) {
        setError(t("finances.unified.formError"));
        return;
      }
      const amount = parseNumber(bedrag);
      if (amount === null) {
        setError(t("finances.unified.formError"));
        return;
      }

      const funded = hasDepot && koppelDepot;
      const payload = {
        title: omschrijving.trim(),
        amount,
        spentOn: datum.trim() || null,
        notes: notities.trim(),
        kostType,
        categorie,
        fundedByConstructionDepot: funded,
        bouwdepotStatus: funded ? bouwdepotStatus : ("open" as BouwdepotStatus),
      };

      if (isEdit && regel) {
        updateProjectExpense({ id: regel.source_id as ID, ...payload });
      } else {
        createProjectExpense({ projectId: project.id as ID, ...payload });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const dialogTitle = isEdit ? t("finances.unified.editTitle") : t("finances.unified.addTitle");

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
        aria-labelledby="kosten-bewerk-title"
        data-testid="finances-bewerk-modal"
        className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card"
      >
        <h2 id="kosten-bewerk-title" className="text-lg font-semibold text-foreground">
          {dialogTitle}
        </h2>

        <form className="mt-4 space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <label htmlFor="kosten-omschrijving" className={FORM_LABEL}>
              {t("dashboard.looseExpenses.labelDescription")}
            </label>
            <input
              id="kosten-omschrijving"
              data-testid="kosten-field-naam"
              value={omschrijving}
              onChange={(e) => setOmschrijving(e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="kosten-bedrag" className={FORM_LABEL}>
              {t("dashboard.looseExpenses.labelAmount")}
            </label>
            <input
              id="kosten-bedrag"
              data-testid="kosten-field-bedrag"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={bedrag}
              onChange={(e) => setBedrag(e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </div>

          <fieldset>
            <legend className={FORM_LABEL}>{t("finances.unified.labelAmountType")}</legend>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="kost-type"
                  data-testid="kosten-field-werkelijk"
                  checked={kostType === "werkelijk"}
                  onChange={() => setKostType("werkelijk")}
                  className="border-renovation-border"
                />
                {t("finances.unified.amountTypeActual")}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="kost-type"
                  data-testid="kosten-field-geschat"
                  checked={kostType === "geschat"}
                  onChange={() => setKostType("geschat")}
                  className="border-renovation-border"
                />
                {t("finances.unified.amountTypeEstimate")}
              </label>
            </div>
          </fieldset>

          <div>
            <label htmlFor="kosten-categorie" className={FORM_LABEL}>
              {t("finances.unified.labelCategory")}
            </label>
            <select
              id="kosten-categorie"
              data-testid="kosten-field-categorie"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value as KostCategorie)}
              className={INPUT_CLASS}
            >
              {KOST_CATEGORIE_ORDER.map((id) => (
                <option key={id} value={id}>
                  {categorieLabel(id)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="kosten-datum" className={FORM_LABEL}>
              {t("dashboard.looseExpenses.labelDate")}
            </label>
            <input
              id="kosten-datum"
              data-testid="kosten-field-datum"
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {hasDepot ? (
            <>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  data-testid="kosten-field-depot"
                  checked={koppelDepot}
                  onChange={(e) => setKoppelDepot(e.target.checked)}
                  className="rounded border-renovation-border"
                />
                {t("dashboard.looseExpenses.fundedByDepot")}
              </label>
              {koppelDepot ? (
                <div>
                  <label htmlFor="kosten-bankstatus" className={FORM_LABEL}>
                    {t("finances.unified.labelBankStatus")}
                  </label>
                  <select
                    id="kosten-bankstatus"
                    data-testid="kosten-field-bankstatus"
                    value={bouwdepotStatus}
                    onChange={(e) => setBouwdepotStatus(e.target.value as BouwdepotStatus)}
                    className={INPUT_CLASS}
                  >
                    <option value="open">{t("finances.unified.statusOpen")}</option>
                    <option value="ingediend">{t("finances.unified.statusIngediend")}</option>
                    <option value="uitbetaald">{t("finances.unified.statusUitbetaald")}</option>
                  </select>
                </div>
              ) : null}
            </>
          ) : null}

          <div>
            <label htmlFor="kosten-notities" className={FORM_LABEL}>
              {t("dashboard.looseExpenses.labelNotes")}
            </label>
            <textarea
              id="kosten-notities"
              data-testid="kosten-field-notities"
              value={notities}
              onChange={(e) => setNotities(e.target.value)}
              rows={2}
              className={INPUT_CLASS}
            />
          </div>

          {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={busy} data-testid="kosten-save">
              {t("common.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
