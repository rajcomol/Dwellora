"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import { kostenCategoryLabel } from "@/lib/finances/kostenraming";
import type { KostenRegel, KostenRegelType } from "@/lib/mergeKostenItems";
import { projectMoney } from "@/lib/dashboard/projectBudget";
import type { BouwdepotDeclaratieStatus, ID, Project } from "@/lib/renovation/types";

export type BewerkModalType = KostenRegelType | "declaratie";

const FORM_LABEL = "mb-1 block text-xs font-medium text-renovation-concrete";
const INPUT_CLASS =
  "w-full rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated";

type DeclaratieFormStatus = "open" | "ingediend" | "uitbetaald";

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

function declaratieDisplayStatus(status: BouwdepotDeclaratieStatus): DeclaratieFormStatus {
  if (status === "uitbetaald") return "uitbetaald";
  if (status === "ingediend" || status === "uitbetaling_verwacht") return "ingediend";
  return "open";
}

type Props = {
  project: Project;
  open: boolean;
  type: BewerkModalType;
  regel?: KostenRegel | null;
  declaratieId?: ID | null;
  onClose: () => void;
};

export default function KostenBewerkModal({ project, open, type, regel = null, declaratieId = null, onClose }: Props) {
  const { t } = useI18n();
  const {
    tasks,
    projectExpenses,
    declaraties,
    createTask,
    updateTask,
    createProjectExpense,
    updateProjectExpense,
    createDeclaratie,
    updateDeclaratie,
  } = useRenovation();

  const isEdit = type === "declaratie" ? Boolean(declaratieId) : Boolean(regel);
  const hasDepot = projectMoney(project).depot > 0;

  const [naam, setNaam] = useState("");
  const [categorie, setCategorie] = useState("");
  const [geschatteKosten, setGeschatteKosten] = useState("");
  const [werkelijkeKosten, setWerkelijkeKosten] = useState("");
  const [koppelDepot, setKoppelDepot] = useState(false);
  const [bedrag, setBedrag] = useState("");
  const [datum, setDatum] = useState(todayIso);
  const [notities, setNotities] = useState("");
  const [status, setStatus] = useState<DeclaratieFormStatus>("open");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (regel) {
      if (type === "taak") {
        const task = tasks.find((tk) => tk.id === regel.source_id);
        setNaam(task?.title ?? regel.omschrijving);
        setCategorie(kostenCategoryLabel(task?.title ?? regel.omschrijving));
        setGeschatteKosten(task?.estimatedCost != null ? String(task.estimatedCost) : "");
        setWerkelijkeKosten(task && task.actualCost > 0 ? String(task.actualCost) : "");
        setKoppelDepot(task?.fundedByConstructionDepot ?? false);
      } else if (type === "losse_uitgave") {
        const expense = projectExpenses.find((e) => e.id === regel.source_id);
        setNaam(expense?.title ?? regel.omschrijving);
        setCategorie(regel.categorie);
        setBedrag(String(expense?.amount ?? regel.bedrag));
        setDatum(expense?.spentOn ?? regel.datum ?? todayIso());
        setKoppelDepot(expense?.fundedByConstructionDepot ?? false);
        setNotities(expense?.notes ?? "");
      }
    } else if (type === "declaratie" && declaratieId) {
      const decl = declaraties?.find((d) => d.id === declaratieId);
      setNaam(decl?.omschrijving ?? "");
      setBedrag(decl ? String(decl.bedrag) : "");
      const declStatus = decl ? declaratieDisplayStatus(decl.status) : "open";
      setStatus(declStatus);
      setDatum(decl?.ingediendOp?.slice(0, 10) ?? decl?.uitbetaaldOp?.slice(0, 10) ?? todayIso());
    } else {
      setNaam("");
      setCategorie("");
      setGeschatteKosten("");
      setWerkelijkeKosten("");
      setKoppelDepot(false);
      setBedrag("");
      setDatum(todayIso());
      setNotities("");
      setStatus("open");
    }
    setError(null);
  }, [open, regel, declaratieId, type, tasks, projectExpenses, declaraties]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (type === "taak") {
        if (!naam.trim()) {
          setError(t("finances.unified.formError"));
          return;
        }
        const estimated = geschatteKosten.trim() === "" ? null : parseNumber(geschatteKosten);
        const actual = werkelijkeKosten.trim() === "" ? 0 : (parseNumber(werkelijkeKosten) ?? 0);
        if (geschatteKosten.trim() !== "" && estimated === null) {
          setError(t("finances.unified.formError"));
          return;
        }
        if (werkelijkeKosten.trim() !== "" && parseNumber(werkelijkeKosten) === null) {
          setError(t("finances.unified.formError"));
          return;
        }

        if (isEdit && regel) {
          const ok = await updateTask({
            id: regel.source_id as ID,
            title: naam.trim(),
            estimatedCost: estimated,
            actualCost: actual,
            fundedByConstructionDepot: hasDepot && koppelDepot,
          });
          if (!ok) {
            setError(t("finances.unified.saveError"));
            return;
          }
        } else {
          const ok = await createTask({
            projectId: project.id as ID,
            title: naam.trim(),
            roomIds: [],
            status: "todo",
            estimatedCost: estimated,
            actualCost: actual,
            durationDays: 1,
            priority: "medium",
            fundedByConstructionDepot: hasDepot && koppelDepot,
          });
          if (!ok) {
            setError(t("finances.unified.saveError"));
            return;
          }
        }
      } else if (type === "losse_uitgave") {
        if (!naam.trim()) {
          setError(t("finances.unified.formError"));
          return;
        }
        const amount = parseNumber(bedrag);
        if (amount === null) {
          setError(t("finances.unified.formError"));
          return;
        }

        if (isEdit && regel) {
          updateProjectExpense({
            id: regel.source_id as ID,
            title: naam.trim(),
            amount,
            spentOn: datum.trim() || null,
            notes: notities.trim(),
          });
        } else {
          createProjectExpense({
            projectId: project.id as ID,
            title: naam.trim(),
            amount,
            spentOn: datum.trim() || null,
            notes: notities.trim(),
            fundedByConstructionDepot: hasDepot && koppelDepot,
          });
        }
      } else {
        if (!naam.trim()) {
          setError(t("finances.unified.formError"));
          return;
        }
        const amount = parseNumber(bedrag);
        if (amount === null) {
          setError(t("finances.unified.formError"));
          return;
        }

        const declStatus: BouwdepotDeclaratieStatus = status;
        const payload = {
          omschrijving: naam.trim(),
          bedrag: amount,
          status: declStatus,
          ingediendOp: datum.trim() || null,
          uitbetaaldOp: status === "uitbetaald" ? datum.trim() || null : null,
          taakId: null as ID | null,
          notities: "",
        };

        if (isEdit && declaratieId) {
          const ok = await updateDeclaratie(declaratieId, payload);
          if (!ok) {
            setError(t("finances.unified.saveError"));
            return;
          }
        } else {
          const id = await createDeclaratie({ projectId: project.id as ID, ...payload });
          if (!id) {
            setError(t("finances.unified.saveError"));
            return;
          }
        }
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
          {type === "taak" ? (
            <>
              <div>
                <label htmlFor="kosten-naam" className={FORM_LABEL}>
                  {t("finances.unified.labelName")}
                </label>
                <input
                  id="kosten-naam"
                  data-testid="kosten-field-naam"
                  value={naam}
                  onChange={(e) => {
                    setNaam(e.target.value);
                    setCategorie(kostenCategoryLabel(e.target.value));
                  }}
                  required
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="kosten-categorie" className={FORM_LABEL}>
                  {t("finances.unified.labelCategory")}
                </label>
                <input
                  id="kosten-categorie"
                  value={categorie}
                  readOnly
                  className={`${INPUT_CLASS} text-renovation-concrete`}
                />
              </div>
              <div>
                <label htmlFor="kosten-geschat" className={FORM_LABEL}>
                  {t("projectDetail.estimatedCost")}
                </label>
                <input
                  id="kosten-geschat"
                  data-testid="kosten-field-geschat"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={geschatteKosten}
                  onChange={(e) => setGeschatteKosten(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="kosten-werkelijk" className={FORM_LABEL}>
                  {t("projectDetail.actualCost")}
                </label>
                <input
                  id="kosten-werkelijk"
                  data-testid="kosten-field-werkelijk"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={werkelijkeKosten}
                  onChange={(e) => setWerkelijkeKosten(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              {hasDepot ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    data-testid="kosten-field-depot"
                    checked={koppelDepot}
                    onChange={(e) => setKoppelDepot(e.target.checked)}
                    className="rounded border-renovation-border"
                  />
                  {t("finances.unified.linkDepot")}
                </label>
              ) : null}
            </>
          ) : null}

          {type === "losse_uitgave" ? (
            <>
              <div>
                <label htmlFor="kosten-omschrijving" className={FORM_LABEL}>
                  {t("dashboard.looseExpenses.labelDescription")}
                </label>
                <input
                  id="kosten-omschrijving"
                  data-testid="kosten-field-naam"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
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
              <div>
                <label htmlFor="kosten-cat-loose" className={FORM_LABEL}>
                  {t("finances.unified.labelCategory")}
                </label>
                <input
                  id="kosten-cat-loose"
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              {hasDepot ? (
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
            </>
          ) : null}

          {type === "declaratie" ? (
            <>
              <div>
                <label htmlFor="kosten-decl-omschrijving" className={FORM_LABEL}>
                  {t("bouwdepotDeclaraties.labelDescription")}
                </label>
                <input
                  id="kosten-decl-omschrijving"
                  data-testid="kosten-field-naam"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  required
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="kosten-decl-bedrag" className={FORM_LABEL}>
                  {t("bouwdepotDeclaraties.labelAmount")}
                </label>
                <input
                  id="kosten-decl-bedrag"
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
              <div>
                <label htmlFor="kosten-decl-status" className={FORM_LABEL}>
                  {t("bouwdepotDeclaraties.labelStatus")}
                </label>
                <select
                  id="kosten-decl-status"
                  data-testid="kosten-field-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DeclaratieFormStatus)}
                  className={INPUT_CLASS}
                >
                  <option value="open">{t("finances.unified.statusOpen")}</option>
                  <option value="ingediend">{t("finances.unified.statusIngediend")}</option>
                  <option value="uitbetaald">{t("finances.unified.statusUitbetaald")}</option>
                </select>
              </div>
              <div>
                <label htmlFor="kosten-decl-datum" className={FORM_LABEL}>
                  {t("dashboard.looseExpenses.labelDate")}
                </label>
                <input
                  id="kosten-decl-datum"
                  data-testid="kosten-field-datum"
                  type="date"
                  value={datum}
                  onChange={(e) => setDatum(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </>
          ) : null}

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
