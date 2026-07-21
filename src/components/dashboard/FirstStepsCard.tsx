"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
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
      strokeWidth="2.5"
      className="h-3.5 w-3.5"
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

function stepWhyKey(id: FirstStepId): string | null {
  switch (id) {
    case "room":
      return "firstSteps.whyRoom";
    case "task":
      return "firstSteps.whyTask";
    case "expense":
      return "firstSteps.whyExpense";
    default:
      return null;
  }
}

function stepButtonLabelKey(id: FirstStepId): string | null {
  switch (id) {
    case "room":
      return "firstSteps.buttonRooms";
    case "task":
      return "firstSteps.buttonTask";
    case "expense":
      return "firstSteps.buttonFinances";
    default:
      return null;
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
  const remainingCount = FIRST_STEPS_TOTAL - completedCount;
  const setupComplete = isFirstStepsSetupComplete(steps);
  const firstRoomId = projectId ? firstRoomIdForProject(projectId, rooms) : null;
  const currentStep = steps.find((step) => !step.done) ?? null;
  const currentStepNumber = currentStep ? steps.findIndex((step) => step.id === currentStep.id) + 1 : FIRST_STEPS_TOTAL;

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

  function stepHref(stepId: FirstStepId): string | null {
    if (stepId === "room") {
      return appendProjectQuery("/dashboard/rooms?addRoom=1", projectId);
    }
    if (stepId === "task" && firstRoomId) {
      return appendProjectQuery(`/dashboard/rooms/${firstRoomId}?focus=create-task`, projectId);
    }
    if (stepId === "expense") {
      return appendProjectQuery("/dashboard/finances?add=1", projectId);
    }
    return null;
  }

  const currentHref = currentStep ? stepHref(currentStep.id) : null;
  const currentButtonLabel = currentStep ? stepButtonLabelKey(currentStep.id) : null;
  const currentWhy = currentStep ? stepWhyKey(currentStep.id) : null;

  return (
    <section
      data-testid="first-steps-card"
      className="rounded-2xl border border-renovation-border bg-renovation-elevated p-5 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated sm:p-6"
    >
      {setupComplete ? (
        <div data-testid="first-steps-completion">
          <ol className="mb-5 flex items-center justify-center gap-2" aria-label={t("firstSteps.title")}>
            {steps.map((step, index) => (
              <li
                key={step.id}
                data-testid={`first-steps-step-${step.id}`}
                data-done={step.done ? "true" : "false"}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-renovation-accent bg-renovation-accent text-white"
                aria-label={`${t(stepLabelKey(step.id))} — ${t("firstSteps.stepCounter", { current: index + 1, total: FIRST_STEPS_TOTAL })}`}
              >
                <CheckIcon />
              </li>
            ))}
          </ol>
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
                {t("firstSteps.stepCounter", { current: currentStepNumber, total: FIRST_STEPS_TOTAL })}
              </p>
            </div>
            <p className="text-xs text-renovation-concrete">
              {t("firstSteps.remaining", { count: remainingCount })}
            </p>
          </div>

          <ol className="mt-4 flex items-center gap-2" aria-label={t("firstSteps.title")}>
            {steps.map((step, index) => {
              const isCurrent = currentStep?.id === step.id;
              return (
                <li
                  key={step.id}
                  data-testid={`first-steps-step-${step.id}`}
                  data-done={step.done ? "true" : "false"}
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                    step.done
                      ? "border-renovation-accent bg-renovation-accent text-white"
                      : isCurrent
                        ? "border-renovation-accent bg-renovation-accent/15 text-renovation-accent ring-2 ring-renovation-accent/30"
                        : "border-renovation-border bg-renovation-surface text-renovation-concrete/70",
                  ].join(" ")}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={t(stepLabelKey(step.id))}
                >
                  {step.done ? <CheckIcon /> : index + 1}
                </li>
              );
            })}
          </ol>

          {currentStep ? (
            <div className="mt-5 rounded-xl border border-renovation-accent/30 bg-renovation-accent/10 p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-renovation-accent">
                {t("firstSteps.nowLabel")}
              </p>
              <h3 className="mt-1.5 text-base font-semibold text-foreground sm:text-lg">
                {t(stepLabelKey(currentStep.id))}
              </h3>
              {currentWhy ? (
                <p className="mt-2 text-sm leading-relaxed text-renovation-concrete">{t(currentWhy)}</p>
              ) : null}
              {currentHref && currentButtonLabel ? (
                <div className="mt-4">
                  <Link
                    href={currentHref}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-renovation-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-renovation-steel"
                  >
                    {t(currentButtonLabel)}
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      <div className="mt-4 text-center">
        <button
          type="button"
          data-testid="first-steps-skip"
          className="text-xs font-medium text-renovation-concrete/80 transition-colors hover:text-renovation-concrete"
          onClick={() => void dismissCard(false)}
        >
          {t("firstSteps.laterButton")}
        </button>
      </div>
    </section>
  );
}
