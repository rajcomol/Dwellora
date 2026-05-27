"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import { filterTasksForProjectId } from "@/lib/dashboard/projectBudget";
import type { BouwdepotDeclaratie, BouwdepotDeclaratieStatus, ID, Project } from "@/lib/renovation/types";
import { z } from "zod";

const FORM_LABEL = "mb-1 block text-xs font-medium text-renovation-concrete";

const STATUS_OPTIONS: BouwdepotDeclaratieStatus[] = [
  "open",
  "ingediend",
  "uitbetaling_verwacht",
  "uitbetaald",
];

const declaratieFormSchema = z.object({
  omschrijving: z.string().trim().min(1),
  bedrag: z
    .string()
    .transform((s) => (s.trim() === "" ? NaN : Number.parseFloat(s)))
    .pipe(z.number().finite().min(0)),
  status: z.enum(["open", "ingediend", "uitbetaling_verwacht", "uitbetaald"]),
  ingediendOp: z.string(),
  uitbetaaldOp: z.string(),
  taakId: z.string(),
  notities: z.string(),
});

type Props = {
  project: Project;
  open: boolean;
  onClose: () => void;
  declaratie?: BouwdepotDeclaratie | null;
};

export default function BouwdepotDeclaratieModal({ project, open, onClose, declaratie }: Props) {
  const { t } = useI18n();
  const { tasks, rooms, createDeclaratie, updateDeclaratie } = useRenovation();
  const isEdit = Boolean(declaratie);

  const [omschrijving, setOmschrijving] = useState("");
  const [bedrag, setBedrag] = useState("");
  const [status, setStatus] = useState<BouwdepotDeclaratieStatus>("open");
  const [ingediendOp, setIngediendOp] = useState("");
  const [uitbetaaldOp, setUitbetaaldOp] = useState("");
  const [taakId, setTaakId] = useState("");
  const [notities, setNotities] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const projectTasks = useMemo(() => {
    const roomIds = new Set(rooms.filter((r) => r.projectId === project.id).map((r) => r.id));
    return filterTasksForProjectId(tasks, project.id, roomIds);
  }, [tasks, rooms, project.id]);

  useEffect(() => {
    if (!open) return;
    if (declaratie) {
      setOmschrijving(declaratie.omschrijving);
      setBedrag(String(declaratie.bedrag));
      setStatus(declaratie.status);
      setIngediendOp(declaratie.ingediendOp ?? "");
      setUitbetaaldOp(declaratie.uitbetaaldOp ?? "");
      setTaakId(declaratie.taakId ?? "");
      setNotities(declaratie.notities);
    } else {
      setOmschrijving("");
      setBedrag("");
      setStatus("open");
      setIngediendOp("");
      setUitbetaaldOp("");
      setTaakId("");
      setNotities("");
    }
    setError(null);
  }, [open, declaratie]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = declaratieFormSchema.safeParse({
      omschrijving,
      bedrag,
      status,
      ingediendOp,
      uitbetaaldOp,
      taakId,
      notities,
    });
    if (!parsed.success) {
      setError(t("bouwdepotDeclaraties.formError"));
      return;
    }

    setBusy(true);
    try {
      const d = parsed.data;
      const payload = {
        omschrijving: d.omschrijving,
        bedrag: d.bedrag,
        status: d.status,
        ingediendOp: d.ingediendOp.trim() || null,
        uitbetaaldOp: d.status === "uitbetaald" ? d.uitbetaaldOp.trim() || null : null,
        taakId: d.taakId.trim() || null,
        notities: d.notities.trim(),
      };

      if (isEdit && declaratie) {
        const ok = await updateDeclaratie(declaratie.id, payload);
        if (!ok) {
          setError(t("bouwdepotDeclaraties.saveError"));
          return;
        }
      } else {
        const id = await createDeclaratie({ projectId: project.id as ID, ...payload });
        if (!id) {
          setError(t("bouwdepotDeclaraties.saveError"));
          return;
        }
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const dialogTitle = isEdit
    ? t("bouwdepotDeclaraties.editTitle")
    : t("bouwdepotDeclaraties.addTitle");

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
        aria-label={dialogTitle}
        data-testid="bouwdepot-declaratie-modal"
        className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated"
      >
        <h2 className="text-lg font-semibold text-foreground">{dialogTitle}</h2>

        <form className="mt-4 space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <label htmlFor="decl-omschrijving" className={FORM_LABEL}>
              {t("bouwdepotDeclaraties.labelDescription")}
            </label>
            <input
              id="decl-omschrijving"
              data-testid="declaratie-omschrijving"
              value={omschrijving}
              onChange={(e) => setOmschrijving(e.target.value)}
              required
              className="w-full rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
          <div>
            <label htmlFor="decl-bedrag" className={FORM_LABEL}>
              {t("bouwdepotDeclaraties.labelAmount")}
            </label>
            <input
              id="decl-bedrag"
              data-testid="declaratie-bedrag"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={bedrag}
              onChange={(e) => setBedrag(e.target.value)}
              required
              className="w-full rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
          <div>
            <label htmlFor="decl-ingediend" className={FORM_LABEL}>
              {t("bouwdepotDeclaraties.labelSubmittedOn")}
            </label>
            <input
              id="decl-ingediend"
              data-testid="declaratie-ingediend-op"
              type="date"
              value={ingediendOp}
              onChange={(e) => setIngediendOp(e.target.value)}
              className="w-full rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>
          <div>
            <label htmlFor="decl-status" className={FORM_LABEL}>
              {t("bouwdepotDeclaraties.labelStatus")}
            </label>
            <select
              id="decl-status"
              data-testid="declaratie-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as BouwdepotDeclaratieStatus)}
              className="w-full rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {t(`bouwdepotDeclaraties.status.${s}`)}
                </option>
              ))}
            </select>
          </div>
          {status === "uitbetaald" ? (
            <div>
              <label htmlFor="decl-uitbetaald" className={FORM_LABEL}>
                {t("bouwdepotDeclaraties.labelPaidOn")}
              </label>
              <input
                id="decl-uitbetaald"
                data-testid="declaratie-uitbetaald-op"
                type="date"
                value={uitbetaaldOp}
                onChange={(e) => setUitbetaaldOp(e.target.value)}
                className="w-full rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
              />
            </div>
          ) : null}
          <div>
            <label htmlFor="decl-taak" className={FORM_LABEL}>
              {t("bouwdepotDeclaraties.labelTask")}
            </label>
            <select
              id="decl-taak"
              data-testid="declaratie-taak"
              value={taakId}
              onChange={(e) => setTaakId(e.target.value)}
              className="w-full rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            >
              <option value="">{t("bouwdepotDeclaraties.noTask")}</option>
              {projectTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="decl-notities" className={FORM_LABEL}>
              {t("bouwdepotDeclaraties.labelNotes")}
            </label>
            <textarea
              id="decl-notities"
              value={notities}
              onChange={(e) => setNotities(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
            />
          </div>

          {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={busy} data-testid="declaratie-save">
              {t("common.save")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
