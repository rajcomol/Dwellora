import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import { createProjectAndSelect, openProjectSettings, uniqueName } from "./helpers/dashboard";

test.describe("project samenwerken uitnodiging", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("eigenaar kan medebewoner uitnodigen via instellingen tab Samenwerken", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Samenwerken", testInfo);
    const inviteEmail = `e2e-invite-${Date.now()}-${testInfo.parallelIndex}@example.com`;

    await createProjectAndSelect(page, { name: projectName, ownContribution: "15000" });
    await openProjectSettings(page);

    const samenwerkenTab = page.getByTestId("settings-tab-samenwerken");
    await expect(samenwerkenTab).toBeVisible({ timeout: 60_000 });
    await samenwerkenTab.click();
    await expect(page).toHaveURL(/tab=samenwerken/);

    await expect(page.getByRole("heading", { name: "Samenwerken", exact: true })).toBeVisible({
      timeout: 60_000,
    });

    await page.locator("#collab-email").fill(inviteEmail);
    await page.getByRole("button", { name: "Uitnodiging aanmaken" }).click();

    await expect(page.getByText(`Openstaande uitnodiging naar ${inviteEmail}`)).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByRole("button", { name: "Uitnodiging intrekken" })).toBeVisible();
  });
});
