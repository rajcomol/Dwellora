"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { useHelp } from "@/components/help/HelpProvider";
import { useFirstStepsOnboarding } from "@/components/onboarding/FirstStepsOnboardingProvider";
import { appendProjectQuery } from "@/components/layout/tab-nav-config";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import Button from "@/components/ui/Button";
import { useI18n } from "@/i18n/provider";
import {
  FIRST_STEPS_TOTAL,
  buildFirstSteps,
  completedFirstStepCount,
  countActiveProjectFirstSteps,
  firstRoomIdForProject,
  firstStepsProgressPercent,
  isFirstStepsSetupComplete,
  shouldShowFirstStepsCard,
  type FirstStepId,
} from "@/lib/onboarding/first-steps";

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function stepLabelKey(id: FirstStepId): string {
  switch (id) {
    case "project":
      return "firstSteps.stepProject";
    case "room":
      return "firstSteps.stepRoom";
    case "task":
      return "firstSteps.stepTask";
    case "expense":
      return "firstSteps.stepExpense";
  }
}

export default function FirstStepsCard() {
  const { t } = useI18n();
  const { startTour } = useHelp();
  const { isProfileReady, isOnboardingCompleted, markOnboardingCompleted } = useFirstStepsOnboarding();
  const { selectedProjectId } = useSelectedProject();
  const { projects, rooms, tasks, projectExpenses } = useRenovation();

  const projectId = selectedProjectId ?? projects[0]?.id ?? null;
  const counts = useMemo(
    () =>
      countActiveProjectFirstSteps(
        projectId,
        rooms,
        tasks,
        projectExpenses,
        projects.length > 0
      ),
    [projectId, rooms, tasks, projectExpenses, projects.length]
  );
  const steps = useMemo(() => buildFirstSteps(counts), [counts]);
  const completedCount = completedFirstStepCount(steps);
  const progressPct = firstStepsProgressPercent(steps);
  const setupComplete = isFirstStepsSetupComplete(steps);
  const firstRoomId = projectId ? firstRoomIdForProject(projectId, rooms) : null;
  const roomStepDone = steps.find((step) => step.id === "room")?.done ?? false;

  const visible = shouldShowFirstStepsCard({
    isProfileReady,
    isOnboardingCompleted,
    hasProject: projects.length > 0,
  });

  if (!visible || !projectId) {
    return null;
  }

  async function dismissCard(startTourAfter = false) {
    await markOnboardingCompleted();
    if (startTourAfter) {
      startTour();
    }
  }

  function stepAction(stepId: FirstStepId) {
    if (stepId === "room") {
      return (
        <Link
          href={appendProjectQuery("/dashboard/rooms?addRoom=1", projectId)}
          className="inline-flex rounded-lg bg-renovation-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-renovation-steel"
        >
          {t("firstSteps.buttonRooms")}
        </Link>
      );
    }

    if (stepId === "task" && firstRoomId) {
      return (
        <Link
          href={appendProjectQuery(`/dashboard/rooms/${firstRoomId}?focus=create-task`, projectId)}
          className="inline-flex rounded-lg bg-renovation-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-renovation-steel"
        >
          {t("firstSteps.buttonTask")}
        </Link>
      );
    }

    if (stepId === "expense") {
      return (
        <Link
          href={appendProjectQuery("/dashboard/finances?add=1", projectId)}
          className="inline-flex rounded-lg bg-renovation-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-renovation-steel"
        >
          {t("firstSteps.buttonFinances")}
        </Link>
      );
    }

    return null;
  }

  return (
    <section
      data-testid="first-steps-card"
      className="rounded-2xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated sm:p-6"
    >
      {setupComplete ? (
        <div data-testid="first-steps-completion">
          <h2 className="text-lg font-semibold text-foreground">{t("firstSteps.completionTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-renovation-concrete">{t("firstSteps.completionBody")}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" data-testid="first-steps-tour-yes" onClick={() => void dismissCard(true)}>
              {t("firstSteps.tourYes")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              data-testid="first-steps-tour-no"
              onClick={() => void dismissCard(false)}
            >
              {t("firstSteps.tourNo")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("firstSteps.title")}</h2>
              <p className="mt-1 text-sm text-renovation-concrete">
                {t("firstSteps.progress", { completed: completedCount, total: FIRST_STEPS_TOTAL })}
              </p>
            </div>
          </div>

          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-renovation-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={FIRST_STEPS_TOTAL}
            aria-valuenow={completedCount}
            aria-label={t("firstSteps.title")}
          >
            <div
              className="h-full rounded-full bg-renovation-accent transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <ol className="mt-5 space-y-3">
            {steps.map((step) => {
              const isTaskStep = step.id === "task";
              const locked = isTaskStep && !roomStepDone;
              const showAction = !step.done && !locked && step.id !== "project";

              return (
                <li
                  key={step.id}
                  data-testid={`first-steps-step-${step.id}`}
                  data-done={step.done ? "true" : "false"}
                  className={[
                    "flex flex-col gap-2 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between",
                    step.done
                      ? "border-renovation-border/70 bg-renovation-surface/60"
                      : locked
                        ? "border-renovation-border/50 bg-renovation-surface/30 opacity-60"
                        : "border-renovation-border bg-renovation-surface",
                  ].join(" ")}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={[
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                        step.done
                          ? "border-renovation-accent bg-renovation-accent text-white"
                          : "border-renovation-border bg-renovation-elevated text-renovation-concrete",
                      ].join(" ")}
                      aria-hidden="true"
                    >
                      {step.done ? <CheckIcon /> : steps.indexOf(step) + 1}
                    </span>
                    <span
                      className={[
                        "text-sm",
                        step.done ? "text-renovation-concrete line-through" : "font-medium text-foreground",
                      ].join(" ")}
                    >
                      {t(stepLabelKey(step.id))}
                    </span>
                  </div>
                  {showAction ? <div className="sm:shrink-0">{stepAction(step.id)}</div> : null}
                </li>
              );
            })}
          </ol>
        </>
      )}

      <div className="mt-4 text-center">
        <button
          type="button"
          data-testid="first-steps-skip"
          className="text-xs font-medium text-renovation-concrete underline decoration-renovation-border underline-offset-2 transition-colors hover:text-renovation-steel"
          onClick={() => void dismissCard(false)}
        >
          {t("firstSteps.skip")}
        </button>
      </div>
    </section>
  );
}
