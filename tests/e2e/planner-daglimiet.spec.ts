import { test, expect, type Page } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import { createProjectAndSelect, gotoProjectPath, uniqueName } from "./helpers/dashboard";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_BASE64, "base64");

async function openPlannerPage(page: Page): Promise<void> {
  await gotoProjectPath(page, "/dashboard/planner");
  await expect(page.getByRole("heading", { name: "Maak je nieuwe situatie" })).toBeVisible({ timeout: 60_000 });
}

async function mockPlannerQuota(page: Page, quota: { used: number; limit: number; remaining: number }): Promise<void> {
  await page.route("**/api/planner/quota", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(quota),
    });
  });
}

test.describe("Sfeerbeeld daglimiet", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("toont quota-indicator met resterende generaties", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Daglimiet Quota", testInfo);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });

    await mockPlannerQuota(page, { used: 2, limit: 5, remaining: 3 });
    await openPlannerPage(page);

    await expect(page.getByTestId("planner-quota")).toContainText("Nog 3 van 5 sfeerbeelden vandaag beschikbaar", {
      timeout: 60_000,
    });
    await expect(page.getByTestId("planner-generate")).toBeVisible();
  });

  test("blokkeert genereren bij bereikte daglimiet", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Daglimiet Block", testInfo);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });

    await mockPlannerQuota(page, { used: 5, limit: 5, remaining: 0 });
    await openPlannerPage(page);

    await expect(page.getByTestId("planner-daily-limit-message")).toContainText(
      "Je hebt vandaag je limiet bereikt. Morgen kun je weer 5 nieuwe sfeerbeelden maken.",
      { timeout: 60_000 }
    );
    await expect(page.getByTestId("planner-generate")).toHaveCount(0);

    await page.locator(`[data-testid="upload-basis"] input[type="file"]`).setInputFiles({
      name: "situatie.png",
      mimeType: "image/png",
      buffer: TINY_PNG_BUFFER,
    });
    await page.getByTestId("planner-beschrijving").fill("Test");
    await expect(page.getByTestId("planner-generate")).toHaveCount(0);
  });
});
