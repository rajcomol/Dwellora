import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured, waitForDashboardAppReady } from "./helpers/auth";

test.describe("project aanmaak-gate", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("account zonder project ziet welkomstscherm met eerste-projectknop", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForDashboardAppReady(page);

    const welcome = page.getByTestId("welcome-no-project");
    const hasWelcome = await welcome.isVisible({ timeout: 15_000 }).catch(() => false);
    test.skip(!hasWelcome, "TEST_USER heeft al projecten; gebruik een account zonder projecten");

    await expect(page.getByRole("heading", { name: "Welkom bij RenoTasker" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Maak je eerste project" })).toBeVisible();
    await expect(page.getByTestId("welcome-create-first-project")).toHaveAttribute("href", "/dashboard/projects");
  });

  test("zonder project redirect tabbladen naar dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForDashboardAppReady(page);

    const hasWelcome = await page.getByTestId("welcome-no-project").isVisible({ timeout: 15_000 }).catch(() => false);
    test.skip(!hasWelcome, "TEST_USER heeft al projecten; gebruik een account zonder projecten");

    await page.goto("/dashboard/rooms");
    await page.waitForURL(/\/dashboard\/?$/, { timeout: 30_000 });
    await expect(page.getByTestId("welcome-no-project")).toBeVisible();
  });

  test("ProjectSwitcher toont + Nieuw project onderaan", async ({ page }) => {
    await page.goto("/dashboard");
    await waitForDashboardAppReady(page);

    const switcher = page.locator('[data-tour="project-switcher"]:visible').first();
    await switcher.click();
    await expect(page.getByTestId("project-switcher-new-project")).toBeVisible();
    await expect(page.getByRole("option", { name: "+ Nieuw project" })).toHaveAttribute("href", "/dashboard/projects");
  });
});
