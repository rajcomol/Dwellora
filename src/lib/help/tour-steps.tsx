import type { Step } from "react-joyride";
import type { TranslateFn } from "@/i18n/create-translator";
import { getFirstVisibleTourTarget } from "@/lib/help/tour-targets";
import { waitForElement } from "@/lib/help/wait-for-element";

type BuildArgs = {
  t: TranslateFn;
};

function visibleTourTarget(selector: string): () => HTMLElement | null {
  return () => getFirstVisibleTourTarget(selector);
}

/** Op mobiel staan Sfeerbeeld en Offertes in het Meer-menu; open dat vóór de stap. */
async function ensureMobileMoreMenuFor(selector: string) {
  if (typeof window === "undefined" || window.innerWidth >= 768) return;
  if (getFirstVisibleTourTarget(selector)) return;
  const more = document.querySelector('[data-testid="bottom-nav-more"]');
  if (more instanceof HTMLElement) {
    more.click();
    await waitForElement(selector, 4000);
  }
}

async function closeMobileMoreMenu() {
  if (typeof window === "undefined" || window.innerWidth >= 768) return;
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await new Promise((resolve) => window.setTimeout(resolve, 250));
}

export function buildDashboardTourSteps({ t }: BuildArgs): Step[] {
  return [
    {
      target: visibleTourTarget('[data-tour="tab-nav"], [data-tour="bottom-nav"]'),
      title: t("onboarding.stepTabsTitle"),
      content: t("onboarding.stepTabsBody"),
      placement: "bottom",
      targetWaitTimeout: 8000,
    },
    {
      target: visibleTourTarget('[data-tour="tour-tab-rooms"]'),
      title: t("onboarding.stepRoomsTitle"),
      content: t("onboarding.stepRoomsBody"),
      placement: "bottom",
      targetWaitTimeout: 8000,
    },
    {
      target: visibleTourTarget('[data-tour="tour-tab-planning"]'),
      title: t("onboarding.stepPlanningTitle"),
      content: t("onboarding.stepPlanningBody"),
      placement: "bottom",
      targetWaitTimeout: 8000,
    },
    {
      target: visibleTourTarget('[data-tour="tour-tab-planner"]'),
      title: t("onboarding.stepPlannerTitle"),
      content: t("onboarding.stepPlannerBody"),
      placement: "bottom",
      before: () => ensureMobileMoreMenuFor('[data-tour="tour-tab-planner"]'),
      targetWaitTimeout: 8000,
    },
    {
      target: visibleTourTarget('[data-tour="tour-tab-finances"]'),
      title: t("onboarding.stepFinancesTitle"),
      content: t("onboarding.stepFinancesBody"),
      placement: "bottom",
      before: closeMobileMoreMenu,
      targetWaitTimeout: 8000,
    },
    {
      target: visibleTourTarget('[data-tour="tour-tab-quotes"]'),
      title: t("onboarding.stepQuotesTitle"),
      content: t("onboarding.stepQuotesBody"),
      placement: "bottom",
      before: () => ensureMobileMoreMenuFor('[data-tour="tour-tab-quotes"]'),
      targetWaitTimeout: 8000,
    },
    {
      target: '[data-tour="kluscoach-fab"]',
      title: t("onboarding.stepKluscoachTitle"),
      content: t("onboarding.stepKluscoachBody"),
      placement: "left",
      before: closeMobileMoreMenu,
      targetWaitTimeout: 8000,
    },
    {
      target: '[data-tour="help-button"]',
      title: t("onboarding.stepHelpTitle"),
      content: t("onboarding.stepHelpBody"),
      placement: "bottom",
      targetWaitTimeout: 8000,
    },
  ];
}
