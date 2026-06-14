import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import {
  addTaskToRoom,
  addRoom,
  createProjectAndSelect,
  openFinancesPage,
  openProjectOverview,
  uniqueName,
} from "./helpers/dashboard";

test.describe("finances unified page", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("loads without subtab navigation and supports filters and add modal", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Financien", testInfo);
    const roomName = uniqueName("Keuken", testInfo);
    const taskTitle = uniqueName("Tegels", testInfo);
    const hiddenTitle = uniqueName("Verborgen taak", testInfo);

    await createProjectAndSelect(page, {
      name: projectName,
      ownContribution: "35000",
      constructionDepotTotal: "10000",
    });
    await addRoom(page, roomName);
    await openProjectOverview(page);
    await addTaskToRoom(page, roomName, taskTitle, { estimatedCost: "500" });
    await addTaskToRoom(page, roomName, hiddenTitle, { estimatedCost: "200" });

    await openFinancesPage(page);
    await expect(page.getByRole("heading", { name: "Financiën" })).toBeVisible();
    await expect(page.getByTestId("finances-page")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("finances-tab-overzicht")).toHaveCount(0);
    await expect(page.getByTestId("finances-budget-cards")).toBeVisible();
    await expect(page.getByTestId("finances-kosten-table")).toBeVisible();
    await expect(page.getByTestId("finances-bouwdepot-section")).toBeVisible();

    const rows = page.getByTestId("finances-kosten-row");
    await expect(rows.first()).toBeVisible({ timeout: 60_000 });
    const initialCount = await rows.count();
    expect(initialCount).toBeGreaterThanOrEqual(1);

    await page.getByTestId("finances-search-filter").fill(taskTitle);
    await expect(rows.filter({ hasText: taskTitle })).toBeVisible();
    await expect(rows.filter({ hasText: hiddenTitle })).toHaveCount(0);

    await page.getByTestId("finances-search-filter").fill("");
    await expect(rows).toHaveCount(initialCount);

    await page.getByTestId("finances-add-button").click();
    const keuzeModal = page.getByTestId("finances-keuze-modal");
    await expect(keuzeModal).toBeVisible({ timeout: 30_000 });
    await expect(keuzeModal.getByTestId("finances-keuze-declaratie")).toHaveCount(0);
    await keuzeModal.getByRole("button", { name: "Annuleren" }).click();
    await expect(keuzeModal).toBeHidden();
    await expect(rows).toHaveCount(initialCount);
  });
});
