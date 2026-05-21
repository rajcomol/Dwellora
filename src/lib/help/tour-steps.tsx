import type { Step } from "react-joyride";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { TranslateFn } from "@/i18n/create-translator";
import { getFirstVisibleTourTarget } from "@/lib/help/tour-targets";
import { waitForElement } from "@/lib/help/wait-for-element";

type BuildArgs = {
  t: TranslateFn;
  router: AppRouterInstance;
  /** Fresh pathname during multi-step navigation (use ref in caller). */
  getPathname: () => string;
};

export function buildDashboardTourSteps({ t, router, getPathname }: BuildArgs): Step[] {
  /** Stap 1: hero bestaat alleen op `/dashboard`; navigeer daarheen en wacht op het kaartje (niet op heel `<main>`). */
  async function ensureDashboardHome() {
    const p = getPathname().replace(/\/$/, "") || "/";
    if (p !== "/dashboard") {
      router.push("/dashboard");
    }
    const hero = await waitForElement('[data-tour="dashboard-hero"]', 15000);
    if (!hero) {
      await waitForElement('[data-tour="dashboard-main"]', 6000);
    }
  }

  async function ensureDashboard() {
    const p = getPathname().replace(/\/$/, "") || "/";
    if (p === "/dashboard") return;
    if (p.startsWith("/dashboard/projects")) {
      router.push("/dashboard");
      await waitForElement('[data-tour="dashboard-main"]');
      return;
    }
    if (p.startsWith("/dashboard/")) return;
    router.push("/dashboard");
    await waitForElement('[data-tour="dashboard-main"]');
  }

  async function ensureProjects() {
    const path = getPathname().replace(/\/$/, "") || "/";
    if (path !== "/dashboard/projects") {
      router.push("/dashboard/projects");
      await waitForElement('[data-tour="projects-list"]');
    }
  }

  async function ensurePlanningHub() {
    const p = getPathname().replace(/\/$/, "") || "/";
    if (p === "/dashboard/planning" || p.startsWith("/dashboard/planning/")) return;
    router.push("/dashboard/planning");
    await waitForElement('[data-tour="planning-hub"]', 15000);
  }

  async function ensureQuotesHub() {
    const p = getPathname().replace(/\/$/, "") || "/";
    if (p.startsWith("/dashboard/quotes")) return;
    router.push("/dashboard/quotes");
    await waitForElement('[data-tour="quotes-hub"]', 15000);
  }

  return [
    {
      target: '[data-tour="dashboard-hero"]',
      title: t("onboarding.stepWelcomeTitle"),
      content: t("onboarding.stepWelcomeBody"),
      placement: "bottom",
      before: ensureDashboardHome,
      targetWaitTimeout: 16000,
    },
    {
      target: () =>
        getFirstVisibleTourTarget('[data-tour="tab-nav"], [data-tour="project-switcher"]'),
      title: t("onboarding.stepNavTitle"),
      content: t("onboarding.stepNavBody"),
      placement: "bottom",
      before: ensureDashboard,
      targetWaitTimeout: 12000,
    },
    {
      target: '[data-tour="brand-home"]',
      title: t("onboarding.stepLogoTitle"),
      content: t("onboarding.stepLogoBody"),
      placement: "bottom",
      before: ensureDashboard,
      targetWaitTimeout: 12000,
    },
    {
      target: '[data-tour="projects-list"]',
      title: t("onboarding.stepProjectsTitle"),
      content: t("onboarding.stepProjectsBody"),
      placement: "bottom",
      before: ensureProjects,
      targetWaitTimeout: 12000,
    },
    {
      target: '[data-tour="planning-hub"]',
      title: t("onboarding.stepPlanningTitle"),
      content: t("onboarding.stepPlanningBody"),
      placement: "bottom",
      before: ensurePlanningHub,
      targetWaitTimeout: 16000,
    },
    {
      target: '[data-tour="quotes-hub"]',
      title: t("onboarding.stepQuotesTitle"),
      content: t("onboarding.stepQuotesBody"),
      placement: "bottom",
      before: ensureQuotesHub,
      targetWaitTimeout: 16000,
    },
    {
      target: '[data-tour="kluscoach-fab"]',
      title: t("onboarding.stepChatTitle"),
      content: t("onboarding.stepChatBody"),
      placement: "left",
      targetWaitTimeout: 12000,
    },
  ];
}
