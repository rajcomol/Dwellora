"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";
import { checklistItemTitleSchema } from "@/lib/validation/schemas";
import type { ID } from "@/lib/renovation/types";

const FORM_FIELD_LABEL_CLASS = "mb-1 block text-xs font-medium text-renovation-concrete";

type Props = {
  projectId: ID;
};

export default function KeyHandoverChecklistSection({ projectId }: Props) {
  const { t } = useI18n();
  const { checklistItems, addChecklistItem, updateChecklistItem, deleteChecklistItem } = useRenovation();
  const [checkTitle, setCheckTitle] = useState("");
  const [checkError, setCheckError] = useState<string | null>(null);

  const checklistForProject = useMemo(
    () =>
      checklistItems
        .filter((item) => item.projectId === projectId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [checklistItems, projectId]
  );

  return (
    <section
      data-testid="settings-key-handover-checklist"
      className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-sm dark:border-renovation-border dark:bg-renovation-elevated"
    >
      <h2 className="text-base font-semibold">{t("projectDetail.checklistTitle")}</h2>
      <form
        className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = checklistItemTitleSchema.safeParse({ title: checkTitle });
          if (!parsed.success) {
            setCheckError(t("projectDetail.checklistItemRequired"));
            return;
          }
          setCheckError(null);
          addChecklistItem(projectId, parsed.data.title);
          setCheckTitle("");
        }}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor={`checklist-${projectId}`} className={FORM_FIELD_LABEL_CLASS}>
            {t("projectDetail.labelChecklistItem")}
          </label>
          <input
            id={`checklist-${projectId}`}
            data-testid="checklist-new-item-input"
            value={checkTitle}
            onChange={(e) => {
              setCheckTitle(e.target.value);
              setCheckError(null);
            }}
            placeholder={t("projectDetail.checklistPlaceholder")}
            className="w-full rounded-md border border-renovation-border px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated"
          />
        </div>
        <Button type="submit" data-testid="checklist-add-button">
          {t("projectDetail.checklistAdd")}
        </Button>
      </form>
      {checkError ? <div className="mt-2 text-xs text-red-600 dark:text-red-400">{checkError}</div> : null}
      <ul className="mt-4 space-y-2">
        {checklistForProject.map((item) => (
          <li
            key={item.id}
            data-testid="checklist-item-row"
            className="flex items-center gap-3 rounded-md border border-renovation-border px-3 py-2 dark:border-renovation-border"
          >
            <input
              type="checkbox"
              checked={item.isDone}
              onChange={(e) => updateChecklistItem({ id: item.id, isDone: e.target.checked })}
            />
            <span
              className={
                item.isDone ? "flex-1 text-sm line-through text-renovation-concrete" : "flex-1 text-sm"
              }
            >
              {item.title}
            </span>
            <button
              type="button"
              className="text-xs text-red-600 dark:text-red-400"
              onClick={() => deleteChecklistItem(item.id)}
            >
              {t("projectDetail.checklistDelete")}
            </button>
          </li>
        ))}
        {checklistForProject.length === 0 ? (
          <li className="text-sm text-renovation-concrete">{t("projectDetail.checklistEmpty")}</li>
        ) : null}
      </ul>
    </section>
  );
}
