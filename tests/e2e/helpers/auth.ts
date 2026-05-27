import { expect, type Page } from "@playwright/test";

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

const testUserEmail = readEnv("TEST_USER_EMAIL", "E2E_USER_EMAIL");
const testUserPassword = readEnv("TEST_USER_PASSWORD", "E2E_USER_PASSWORD");

export const testUserCredentialsConfigured = Boolean(testUserEmail.trim() && testUserPassword.trim());

export function requireTestCredentials(): { email: string; password: string } {
  if (!testUserCredentialsConfigured) {
    throw new Error("Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run authenticated Playwright tests.");
  }

  return {
    email: testUserEmail,
    password: testUserPassword,
  };
}

export async function dismissOnboardingTour(page: Page): Promise<void> {
  const skipButton = page.getByRole("button", { name: "Overslaan" }).first();
  if (await skipButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await skipButton.click({ force: true });
    return;
  }

  const closeButton = page.getByRole("button", { name: "Sluiten" }).first();
  if (await closeButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await closeButton.click({ force: true });
  }
}

export async function killTour(page: Page): Promise<void> {
  try {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    for (const selector of [
      '[data-action="close"]',
      '[aria-label="Close"]',
      'button:has-text("Overslaan")',
      'button:has-text("Sluiten")',
      "#react-joyride-step-0 button",
    ]) {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.click({ force: true });
        await page.waitForTimeout(300);
      }
    }
  } catch {
    /* tour was not present */
  }
}

export async function waitForDashboardAppReady(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
  const loadingProjects = page.getByText("Projecten laden…");
  if (await loadingProjects.isVisible().catch(() => false)) {
    await expect(loadingProjects).toBeHidden({ timeout: 60_000 });
  }
  await killTour(page);
  await dismissOnboardingTour(page);
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
}

export async function loginAsTestUser(page: Page): Promise<void> {
  const { email, password } = requireTestCredentials();

  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Wachtwoord").fill(password);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 90_000 });
  await waitForDashboardAppReady(page);
}

export async function selectProjectByName(page: Page, projectName: string): Promise<void> {
  const switcher = page.locator('[data-tour="project-switcher"]:visible').first();
  await switcher.click();
  await page.getByRole("option", { name: projectName, exact: true }).click();
  await page.waitForURL(/[?&]project=/, { timeout: 60_000 });
  await expect(page.locator('[data-tour="project-switcher"]:visible').first()).toContainText(projectName, {
    timeout: 60_000,
  });
}
