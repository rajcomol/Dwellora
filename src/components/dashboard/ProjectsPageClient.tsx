"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useI18n } from "@/i18n/provider";
import { formatCurrency } from "@/lib/format/currency";

export default function ProjectsPageClient() {
  const { t } = useI18n();
  const { projects, createProject } = useRenovation();
  const [name, setName] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [address, setAddress] = useState("");
  const [expectedKeyHandover, setExpectedKeyHandover] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("projects.title")}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("projects.subtitle")}</p>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{t("projects.addNew")}</div>
            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{t("projects.addNewHint")}</div>
          </div>
        </div>

        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) {
              setError(t("projects.errorNameRequired"));
              return;
            }
            const parsedBudget = totalBudget.trim() === "" ? 0 : Number.parseFloat(totalBudget);
            if (!Number.isFinite(parsedBudget)) {
              setError(t("projects.errorBudgetNumber"));
              return;
            }
            createProject({
              name: trimmed,
              totalBudget: parsedBudget,
              address: address.trim(),
              expectedKeyHandover: expectedKeyHandover.trim() || null,
              notes: notes.trim(),
            });
            setName("");
            setTotalBudget("");
            setAddress("");
            setExpectedKeyHandover("");
            setNotes("");
            setError(null);
          }}
        >
          <div className="flex-1 space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("projects.placeholderName")}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            />
            <input
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              placeholder={t("projects.placeholderBudget")}
              inputMode="decimal"
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            />
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("projects.placeholderAddress")}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500">{t("projects.labelKeyHandover")}</label>
              <input
                type="date"
                value={expectedKeyHandover}
                onChange={(e) => setExpectedKeyHandover(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("projects.placeholderNotes")}
              rows={2}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            />
            {error ? (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</div>
            ) : null}
          </div>
          <Button type="submit">{t("projects.createProject")}</Button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">{t("projects.listTitle")}</h2>

        {sortedProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            {t("projects.emptyList")}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedProjects.map((project) => (
              <Card key={project.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{project.name}</div>
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {t("projects.budgetLabel")}: {formatCurrency(project.totalBudget)}
                      {project.expectedKeyHandover
                        ? ` • ${t("projects.keyLabel")}: ${project.expectedKeyHandover}`
                        : ""}
                    </div>
                    {project.address ? (
                      <div className="mt-1 text-xs text-zinc-500 line-clamp-2">{project.address}</div>
                    ) : null}
                  </div>
                  <Link
                    href={`/dashboard/projects/${project.id}`}
                    className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
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
