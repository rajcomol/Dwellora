"use client";

import { useMemo, useState } from "react";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useI18n } from "@/i18n/provider";

export default function ProjectSwitcher({ compact }: { compact?: boolean }) {
  const { t } = useI18n();
  const { projects, isRenovationDataReady } = useRenovation();
  const { selectedProjectId, selectedProject, setSelectedProjectId } = useSelectedProject();
  const [open, setOpen] = useState(false);

  const sorted = useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );

  if (!isRenovationDataReady) {
    return (
      <span className="text-sm text-renovation-concrete">{t("layout.topBar.loadingProjects")}</span>
    );
  }

  const label = selectedProject?.name ?? t("layout.topBar.chooseProject");

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        data-tour="project-switcher"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex max-w-full items-center gap-2 rounded-lg border border-renovation-border bg-renovation-surface px-3 py-1.5 text-left text-sm font-medium text-zinc-900 transition-colors hover:bg-renovation-muted dark:border-renovation-border dark:bg-renovation-muted/40 dark:text-zinc-50",
          compact ? "w-full" : "min-w-[10rem] max-w-[14rem]",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-renovation-concrete" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className="absolute left-0 z-50 mt-1 max-h-64 w-56 overflow-auto rounded-xl border border-renovation-border bg-renovation-elevated py-1 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated"
          >
            <li>
              <button
                type="button"
                role="option"
                aria-selected={selectedProjectId === null}
                className="block w-full px-3 py-2 text-left text-sm text-renovation-concrete hover:bg-renovation-muted dark:hover:bg-zinc-900"
                onClick={() => {
                  setSelectedProjectId(null);
                  setOpen(false);
                }}
              >
                {t("layout.topBar.chooseProject")}
              </button>
            </li>
            {sorted.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={p.id === selectedProjectId}
                  className={[
                    "block w-full truncate px-3 py-2 text-left text-sm hover:bg-renovation-muted dark:hover:bg-zinc-900",
                    p.id === selectedProjectId
                      ? "font-semibold text-renovation-steel dark:text-renovation-accent"
                      : "text-zinc-800 dark:text-zinc-200",
                  ].join(" ")}
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    setOpen(false);
                  }}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
