import { test, expect, type Page } from "@playwright/test";
import {
  loginAsTestUser,
  requireTestCredentials,
  testUserCredentialsConfigured,
  waitForDashboardAppReady,
} from "./helpers/auth";
import { resetFirstStepsOnboardingForTestUser } from "./helpers/first-steps";

async function expectTourNotRunning(page: Page): Promise<void> {
  await page.waitForTimeout(1500);
  await expect(page.getByRole("button", { name: "Volgende" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Klaar" })).toHaveCount(0);
}

async function advanceHelpTour(page: Page): Promise<void> {
  for (let step = 0; step < 12; step += 1) {
    const done = page.getByRole("button", { name: "Klaar" });
    if (await done.isVisible({ timeout: 1500 }).catch(() => false)) {
      await done.click();
      return;
    }
    const next = page.getByRole("button", { name: "Volgende" });
    if (await next.isVisible({ timeout: 1500 }).catch(() => false)) {
      await next.click();
      continue;
    }
    break;
  }
}

test.describe("Help-rondleiding", () => {
  test.beforeEach(async () => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    const { email } = requireTestCredentials();
    await resetFirstStepsOnboardingForTestUser(email);
  });

  test("start alleen via Help en niet automatisch na login", async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto("/dashboard");
    await waitForDashboardAppReady(page);

    await expectTourNotRunning(page);

    await page.getByRole("button", { name: "Help en uitleg" }).click();
    await page.getByRole("button", { name: "Start de rondleiding" }).click();

    await expect(page.getByText("Tabbladen", { exact: true })).toBeVisible();

    await advanceHelpTour(page);
    await expect(page.getByRole("button", { name: "Klaar" })).toHaveCount(0, { timeout: 15_000 });

    await page.reload();
    await waitForDashboardAppReady(page);
    await expectTourNotRunning(page);
  });
});
