"use client";

// TODO: verwijderen na opruiming — er is nog maar één type kostenpost

import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";

type LegacyKostenType = "taak" | "losse_uitgave";

type Props = {
  open: boolean;
  onClose: () => void;
  onChoose: (type: LegacyKostenType) => void;
};

export default function KostenKeuzeModal({ open, onClose, onChoose }: Props) {
  const { t } = useI18n();

  if (!open) return null;

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
        aria-labelledby="kosten-keuze-title"
        data-testid="finances-keuze-modal"
        className="relative z-10 w-full max-w-sm rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card"
      >
        <h2 id="kosten-keuze-title" className="text-lg font-semibold text-foreground">
          {t("finances.unified.choiceTitle")}
        </h2>
        <ul className="mt-4 space-y-2">
          <li>
            <button
              type="button"
              data-testid="finances-keuze-taak"
              className="w-full rounded-lg border border-renovation-border bg-renovation-surface px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-renovation-muted"
              onClick={() => onChoose("taak")}
            >
              {t("finances.unified.choiceTaak")}
            </button>
          </li>
          <li>
            <button
              type="button"
              data-testid="finances-keuze-losse-uitgave"
              className="w-full rounded-lg border border-renovation-border bg-renovation-surface px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-renovation-muted"
              onClick={() => onChoose("losse_uitgave")}
            >
              {t("finances.unified.choiceLoose")}
            </button>
          </li>
        </ul>
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
