import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import {
  addRoom,
  addTaskToRoom,
  createProjectAndSelect,
  openFinancesPage,
  openRoomDetail,
  uniqueName,
} from "./helpers/dashboard";
import { formatCurrency } from "../../src/lib/format/currency";

async function addKostenpost(
  page: import("@playwright/test").Page,
  options: {
    title: string;
    amount: string;
    categorieLabel?: string;
    geschat?: boolean;
    depot?: boolean;
  }
) {
  await page.getByTestId("finances-add-button").click();
  const modal = page.getByTestId("finances-bewerk-modal");
  await expect(modal).toBeVisible({ timeout: 30_000 });
  await modal.getByTestId("kosten-field-naam").fill(options.title);
  await modal.getByTestId("kosten-field-bedrag").fill(options.amount);
  if (options.geschat) {
    await modal.getByTestId("kosten-field-geschat").check();
  }
  if (options.categorieLabel) {
    await modal.getByTestId("kosten-field-categorie").selectOption({ label: options.categorieLabel });
  }
  if (options.depot) {
    await modal.getByTestId("kosten-field-depot").check();
  }
  await modal.getByTestId("kosten-save").click();
  await expect(modal).toBeHidden({ timeout: 60_000 });
}

test.describe("kostenposten financieel overzicht", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("toont alleen kostenposten, categorie-weergave, bouwdepot en taakformulier zonder kosten", async ({
    page,
  }, testInfo) => {
    const projectName = uniqueName("PW Kostenposten", testInfo);
    const roomName = uniqueName("Keuken", testInfo);
    const taskTitle = uniqueName("Tegels leggen", testInfo);
    const expenseTitle = uniqueName("Vloer schatting", testInfo);
    const depotTitle = uniqueName("Depot post", testInfo);
    const depotTotal = 15_000;
    const depotAmount = 2_500;
    const expenseAmount = 800;

    await createProjectAndSelect(page, {
      name: projectName,
      ownContribution: "25000",
      constructionDepotTotal: String(depotTotal),
    });
    await addRoom(page, roomName);
    await openProjectOverview(page);
    await addTaskToRoom(page, roomName, taskTitle);

    await openFinancesPage(page);
    await expect(page.getByTestId("finances-page")).toBeVisible({ timeout: 60_000 });

    const rows = page.getByTestId("finances-kosten-row");
    await expect(rows).toHaveCount(0);

    await addKostenpost(page, {
      title: expenseTitle,
      amount: String(expenseAmount),
      categorieLabel: "Vloeren",
      geschat: true,
    });

    const expenseRow = rows.filter({ hasText: expenseTitle });
    await expect(expenseRow).toBeVisible({ timeout: 60_000 });
    await expect(expenseRow).toContainText("Vloeren");
    await expect(expenseRow).toContainText("Geschat");
    await expect(expenseRow).not.toHaveAttribute("data-kosten-type", "taak");

    await page.getByTestId("finances-view-category").click();
    const vloerenGroup = page
      .getByTestId("finances-category-group")
      .filter({ hasText: "Vloeren" });
    await expect(vloerenGroup).toBeVisible();
    await expect(vloerenGroup).toContainText(formatCurrency(expenseAmount));

    await page.getByTestId("bouwdepot-add-expense").click();
    const depotModal = page.getByTestId("finances-bewerk-modal");
    await expect(depotModal).toBeVisible();
    await expect(depotModal.getByTestId("kosten-field-depot")).toBeChecked();
    await depotModal.getByTestId("kosten-field-naam").fill(depotTitle);
    await depotModal.getByTestId("kosten-field-bedrag").fill(String(depotAmount));
    await depotModal.getByTestId("kosten-save").click();
    await expect(depotModal).toBeHidden({ timeout: 60_000 });

    const depotRow = page.getByTestId("bouwdepot-row").filter({ hasText: depotTitle });
    await expect(depotRow).toBeVisible({ timeout: 60_000 });
    await expect(depotRow.getByTestId("bouwdepot-status-select")).toBeVisible();

    const expectedRemaining = depotTotal - depotAmount;
    await expect(page.getByTestId("bouwdepot-stat-resterend-amount")).toHaveText(
      formatCurrency(expectedRemaining),
      { timeout: 60_000 }
    );

    await openRoomDetail(page, roomName);
    await expect(page.getByLabel("Geschatte kosten")).toHaveCount(0);
    await expect(page.getByLabel("Werkelijke kosten")).toHaveCount(0);
    await expect(page.getByText("Koppel aan bouwdepot")).toHaveCount(0);
  });
});
