"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { ProjectsPageSkeleton } from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useI18n } from "@/i18n/provider";
import { formatCurrency } from "@/lib/format/currency";
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import { projectCreateFormSchema } from "@/lib/validation/schemas";

export default function ProjectsPageClient() {
  const { t } = useI18n();
  const { projects, createProject, isRenovationDataReady } = useRenovation();
  const [name, setName] = useState("");
  const [ownContribution, setOwnContribution] = useState("");
  const [constructionDepotTotal, setConstructionDepotTotal] = useState("");
  const [address, setAddress] = useState("");
  const [expectedKeyHandover, setExpectedKeyHandover] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );

  if (!isRenovationDataReady) {
    return <ProjectsPageSkeleton />;
  }

  const fieldLabelClass = "mb-1 block text-xs font-medium text-renovation-concrete";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("projects.title")}</h1>
          <p className="mt-1 text-sm leading-relaxed text-renovation-concrete">{t("projects.subtitle")}</p>
        </div>
      </div>

      <section className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-sm dark:border-renovation-border dark:bg-renovation-elevated">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{t("projects.addNew")}</div>
            <div className="mt-1 text-xs text-renovation-concrete">{t("projects.addNewHint")}</div>
          </div>
        </div>

        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = projectCreateFormSchema.safeParse({
              name,
              ownContribution,
              constructionDepotTotal,
              address,
              expectedKeyHandover,
              notes,
            });
            if (!parsed.success) {
              const path = parsed.error.issues[0]?.path[0];
              if (path === "name") {
                setError(t("projects.errorNameRequired"));
                return;
              }
              if (path === "ownContribution" || path === "constructionDepotTotal") {
                setError(t("projects.errorBudgetNumber"));
                return;
              }
              setError(t("validation.generic"));
              return;
            }
            const d = parsed.data;
            createProject({
              name: d.name,
              ownContribution: d.ownContribution,
              constructionDepotTotal: d.constructionDepotTotal,
              address: d.address.trim(),
              expectedKeyHandover: d.expectedKeyHandover.trim() || null,
              notes: d.notes.trim(),
            });
            setName("");
            setOwnContribution("");
            setConstructionDepotTotal("");
            setAddress("");
            setExpectedKeyHandover("");
            setNotes("");
            setError(null);
          }}
        >
          <div className="flex-1 space-y-3">
            <div>
              <label htmlFor="project-create-name" className={fieldLabelClass}>
                {t("projects.labelName")}
              </label>
              <input
                id="project-create-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("projects.placeholderName")}
                className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm outline-none focus:border-renovation-steel dark:border-renovation-border dark:bg-renovation-elevated"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="project-create-own" className={fieldLabelClass}>
                  {t("budget.ownMoney")}
                </label>
                <input
                  id="project-create-own"
                  value={ownContribution}
                  onChange={(e) => setOwnContribution(e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm outline-none focus:border-renovation-steel dark:border-renovation-border dark:bg-renovation-elevated"
                />
              </div>
              <div>
                <label htmlFor="project-create-depot" className={fieldLabelClass}>
                  {t("budget.depotTotal")}
                </label>
                <input
                  id="project-create-depot"
                  value={constructionDepotTotal}
                  onChange={(e) => setConstructionDepotTotal(e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm outline-none focus:border-renovation-steel dark:border-renovation-border dark:bg-renovation-elevated"
                />
              </div>
            </div>
            <div>
              <label htmlFor="project-create-address" className={fieldLabelClass}>
                {t("projects.labelAddress")}
              </label>
              <input
                id="project-create-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("projects.placeholderAddress")}
                className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm outline-none focus:border-renovation-steel dark:border-renovation-border dark:bg-renovation-elevated"
              />
            </div>
            <div>
              <label htmlFor="project-create-key" className={fieldLabelClass}>
                {t("projects.labelKeyHandover")}
              </label>
              <input
                id="project-create-key"
                type="date"
                value={expectedKeyHandover}
                onChange={(e) => setExpectedKeyHandover(e.target.value)}
                className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm outline-none focus:border-renovation-steel dark:border-renovation-border dark:bg-renovation-elevated"
              />
            </div>
            <div>
              <label htmlFor="project-create-notes" className={fieldLabelClass}>
                {t("projects.labelNotes")}
              </label>
              <textarea
                id="project-create-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("projects.placeholderNotes")}
                rows={2}
                className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm outline-none focus:border-renovation-steel dark:border-renovation-border dark:bg-renovation-elevated"
              />
            </div>
            {error ? (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</div>
            ) : null}
          </div>
          <Button type="submit">{t("projects.createProject")}</Button>
        </form>
      </section>

      <section data-tour="projects-list">
        <h2 className="mb-3 text-base font-semibold">{t("projects.listTitle")}</h2>

        {sortedProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-renovation-border bg-renovation-elevated p-6 text-sm text-renovation-concrete dark:border-renovation-border dark:bg-renovation-elevated">
            {t("projects.emptyList")}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedProjects.map((project) => (
              <Card key={project.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{project.name}</div>
                    <div className="mt-1 text-xs text-renovation-concrete">
                      {t("projects.budgetLabel")}: {formatCurrency(project.totalBudget)}
                      {project.expectedKeyHandover
                        ? ` • ${t("projects.keyLabel")}: ${formatDisplayDate(project.expectedKeyHandover)}`
                        : ""}
                    </div>
                    {project.address ? (
                      <div className="mt-1 text-xs text-renovation-concrete line-clamp-2">{project.address}</div>
                    ) : null}
                  </div>
                  <Link
                    href={`/dashboard/projects/${project.id}`}
                    className="rounded-md bg-renovation-accent px-3 py-2 text-xs font-medium text-white hover:bg-renovation-steel"
                  >
                    {t("projects.openProject")}
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
