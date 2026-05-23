import type { Page } from "@playwright/test";

export const e2eCredentialsConfigured = Boolean(
  process.env.E2E_USER_EMAIL?.trim() && process.env.E2E_USER_PASSWORD?.trim()
);

export function requireE2eCredentials(): void {
  if (!e2eCredentialsConfigured) {
    throw new Error("Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run authenticated e2e tests.");
  }
}

export async function loginAsE2eUser(page: Page): Promise<void> {
  requireE2eCredentials();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(process.env.E2E_USER_EMAIL!);
  await page.getByLabel("Wachtwoord").fill(process.env.E2E_USER_PASSWORD!);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
}

export async function selectProjectByName(page: Page, projectName: string): Promise<void> {
  await page.locator('[data-tour="project-switcher"]').click();
  await page.getByRole("option", { name: projectName, exact: true }).click();
}
