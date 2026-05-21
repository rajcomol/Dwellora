"use client";

import { useState } from "react";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import { constructionDepotNameSchema } from "@/lib/validation/schemas";
import type { ID } from "@/lib/renovation/types";

type Props = {
  projectId: ID;
  open: boolean;
  onClose: () => void;
};

export default function CreateDepotModal({ projectId, open, onClose }: Props) {
  const { t } = useI18n();
  const { createConstructionDepot } = useRenovation();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/40"
        aria-label={t("common.close")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed left-1/2 top-1/2 z-50 w-[min(100%,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-lg dark:border-renovation-border dark:bg-renovation-elevated"
      >
        <h2 className="text-lg font-semibold">{t("bouwdepot.createModalTitle")}</h2>
        <p className="mt-1 text-sm text-renovation-concrete">{t("bouwdepot.createModalHint")}</p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = constructionDepotNameSchema.safeParse({ name });
            if (!parsed.success) {
              setError(t("constructionDepot.formError"));
              return;
            }
            createConstructionDepot({ projectId, name: parsed.data.name });
            setName("");
            setError(null);
            onClose();
          }}
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-renovation-concrete">
              {t("constructionDepot.nameLabel")}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-renovation-border bg-renovation-surface px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-muted/30"
              autoFocus
            />
          </div>
          {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">{t("common.add")}</Button>
          </div>
        </form>
      </div>
    </>
  );
}
