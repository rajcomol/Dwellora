import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import { createProjectAndSelect, openFinancesPage, uniqueName } from "./helpers/dashboard";
import { formatCurrency } from "../../src/lib/format/currency";

test.describe("bouwdepot section on finances page", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("shows four stats, depot-linked expense in list, and correct remaining", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Bouwdepot", testInfo);
    const expenseTitle = uniqueName("Depot uitgave", testInfo);
    const depotTotal = 20_000;
    const expenseAmount = 3_500;

    await createProjectAndSelect(page, {
      name: projectName,
      ownContribution: "10000",
      constructionDepotTotal: String(depotTotal),
    });

    await openFinancesPage(page);
    await expect(page.getByTestId("finances-bouwdepot-section")).toBeVisible({ timeout: 60_000 });

    await expect(page.getByTestId("bouwdepot-stat-totaal")).toBeVisible();
    await expect(page.getByTestId("bouwdepot-stat-ingediend")).toBeVisible();
    await expect(page.getByTestId("bouwdepot-stat-uitbetaald")).toBeVisible();
    await expect(page.getByTestId("bouwdepot-stat-resterend")).toBeVisible();

    await expect(page.getByTestId("bouwdepot-stat-totaal")).toContainText(formatCurrency(depotTotal));

    await page.getByTestId("finances-add-button").click();
    await page.getByTestId("finances-keuze-losse-uitgave").click();
    const modal = page.getByTestId("finances-bewerk-modal");
    await expect(modal).toBeVisible({ timeout: 30_000 });
    await modal.getByTestId("kosten-field-naam").fill(expenseTitle);
    await modal.getByTestId("kosten-field-bedrag").fill(String(expenseAmount));
    await modal.getByTestId("kosten-field-depot").check();
    await modal.getByTestId("kosten-save").click();
    await expect(modal).toBeHidden({ timeout: 60_000 });

    const depotRow = page
      .locator('[data-testid="bouwdepot-row"][data-bouwdepot-type="losse_uitgave"]')
      .filter({ hasText: expenseTitle });
    await expect(depotRow).toBeVisible({ timeout: 60_000 });

    const expectedRemaining = depotTotal - expenseAmount;
    await expect(page.getByTestId("bouwdepot-stat-resterend-amount")).toHaveText(
      formatCurrency(expectedRemaining),
      { timeout: 60_000 }
    );
  });
});
