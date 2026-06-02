import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import { createProjectAndSelect, openFinancesPage, uniqueName } from "./helpers/dashboard";

test.describe("finances page", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("loads finances page and all five subtabs", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Financien", testInfo);
    await createProjectAndSelect(page, {
      name: projectName,
      ownContribution: "35000",
      constructionDepotTotal: "10000",
    });

    await openFinancesPage(page);
    await expect(page.getByRole("heading", { name: "Financiën" })).toBeVisible();
    await expect(page.getByTestId("finances-tab-overzicht")).toBeVisible();
    await expect(page.getByTestId("finances-tab-kostenraming")).toBeVisible();
    await expect(page.getByTestId("finances-tab-declaraties")).toBeVisible();
    await expect(page.getByTestId("finances-tab-uitgaven")).toBeVisible();
    await expect(page.getByTestId("finances-tab-rapporten")).toBeVisible();

    await page.getByTestId("finances-tab-overzicht").click();
    await expect(page.getByTestId("budget-total-spent")).toBeVisible();

    await page.getByTestId("finances-tab-kostenraming").click();
    await expect(page.getByTestId("kostenraming-tab")).toBeVisible();
    await expect(page.getByTestId("kostenraming-totals")).toBeVisible();
    await expect(page.getByTestId("kostenraming-totals")).toContainText("Totaal verwacht");

    await page.getByTestId("finances-tab-declaraties").click();
    await expect(page.getByTestId("bouwdepot-declaraties-section")).toBeVisible();

    await page.getByTestId("finances-tab-uitgaven").click();
    await expect(page.getByTestId("finances-expenses-tab")).toBeVisible();

    await page.getByTestId("finances-tab-rapporten").click();
    await expect(page.getByTestId("reports-bereik-select")).toBeVisible();
  });

  test("adds loose expense via finances tab", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Financien Uitgave", testInfo);
    const expenseTitle = uniqueName("Verf", testInfo);

    await createProjectAndSelect(page, {
      name: projectName,
      ownContribution: "22000",
      constructionDepotTotal: "8000",
    });

    await page.goto("/dashboard/finances?tab=uitgaven", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("finances-expenses-tab")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("finances-add-expense").click();

    const dialog = page.getByRole("dialog", { name: "Uitgave toevoegen" });
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await dialog.getByLabel("Omschrijving").fill(expenseTitle);
    await dialog.getByLabel("Bedrag").fill("345");
    await dialog.getByRole("button", { name: "Opslaan" }).click({ force: true });

    await expect(page.getByTestId("finances-expenses-tab").getByText(expenseTitle, { exact: true })).toBeVisible({
      timeout: 60_000,
    });
  });
});
