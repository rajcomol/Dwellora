import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import {
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

  test("loads kostenposten table with filters and direct add modal", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Financien", testInfo);
    const roomName = uniqueName("Keuken", testInfo);
    const expenseTitle = uniqueName("Elektra schatting", testInfo);

    await createProjectAndSelect(page, {
      name: projectName,
      ownContribution: "35000",
      constructionDepotTotal: "10000",
    });
    await addRoom(page, roomName);
    await openProjectOverview(page);

    await openFinancesPage(page);
    await expect(page.getByRole("heading", { name: "Financiën" })).toBeVisible();
    await expect(page.getByTestId("finances-page")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("finances-tab-overzicht")).toHaveCount(0);
    await expect(page.getByTestId("finances-budget-cards")).toBeVisible();
    await expect(page.getByTestId("finances-kosten-table")).toBeVisible();
    await expect(page.getByTestId("finances-bouwdepot-section")).toBeVisible();
    await expect(page.getByTestId("finances-type-filter")).toHaveCount(0);

    await page.getByTestId("finances-add-button").click();
    const modal = page.getByTestId("finances-bewerk-modal");
    await expect(modal).toBeVisible({ timeout: 30_000 });
    await modal.getByTestId("kosten-field-naam").fill(expenseTitle);
    await modal.getByTestId("kosten-field-bedrag").fill("450");
    await modal.getByTestId("kosten-field-categorie").selectOption({ label: "Elektra" });
    await modal.getByTestId("kosten-save").click();
    await expect(modal).toBeHidden({ timeout: 60_000 });

    const row = page.getByTestId("finances-kosten-row").filter({ hasText: expenseTitle });
    await expect(row).toBeVisible({ timeout: 60_000 });

    await page.getByTestId("finances-search-filter").fill(expenseTitle);
    await expect(row).toBeVisible();
    await page.getByTestId("finances-search-filter").fill("zzzz-geen-match");
    await expect(page.getByTestId("finances-kosten-row")).toHaveCount(0);
  });
});
