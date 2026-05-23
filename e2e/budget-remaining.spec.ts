import { test, expect } from "@playwright/test";
import { e2eCredentialsConfigured, loginAsE2eUser, selectProjectByName } from "./helpers/auth";
import { expectBudgetRemaining, expectBudgetTotalSpent } from "./helpers/budget";

test.describe("budget remaining stat", () => {
  test("shows total budget minus spent and drops when adding a loose expense", async ({ page }) => {
    test.skip(!e2eCredentialsConfigured, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD");

    const stamp = Date.now();
    const projectName = `E2E resterend ${stamp}`;
    const roomName = `Ruimte ${stamp}`;
    const taskTitle = `Taak ${stamp}`;
    const looseTitle = `Losse uitgave ${stamp}`;
    const totalBudget = 50_000;

    await loginAsE2eUser(page);

    await page.goto("/dashboard/projects");
    await page.getByLabel("Projectnaam").fill(projectName);
    await page.getByLabel("Eigen geld").fill(String(totalBudget));
    await page.getByRole("button", { name: "Project aanmaken" }).click();
    await expect(page.getByText(projectName, { exact: true })).toBeVisible({ timeout: 60_000 });

    await selectProjectByName(page, projectName);

    await page.goto("/dashboard/rooms?tab=overzicht");
    await page.getByLabel("Ruimtenaam").fill(roomName);
    await page.getByRole("button", { name: "Ruimte toevoegen" }).click();
    await expect(page.getByText(roomName, { exact: true })).toBeVisible({ timeout: 60_000 });

    const roomCard = page.locator("div.rounded-xl").filter({ hasText: roomName }).first();
    await roomCard.getByLabel("Taaktitel").fill(taskTitle);
    await roomCard.getByLabel("Werkelijke kosten").fill("1000");
    await roomCard.getByRole("button", { name: "Taak toevoegen" }).click();
    await expect(roomCard.getByText(taskTitle)).toBeVisible({ timeout: 60_000 });

    await page.goto("/dashboard");
    await expectBudgetTotalSpent(page, 1000);
    await expectBudgetRemaining(page, totalBudget - 1000);

    await page.getByRole("button", { name: "+ Uitgave toevoegen" }).click();
    const expenseDialog = page.getByRole("dialog", { name: "Uitgave toevoegen" });
    await expenseDialog.getByLabel("Omschrijving").fill(looseTitle);
    await expenseDialog.getByLabel("Bedrag").fill("500");
    await expenseDialog.getByRole("button", { name: "Opslaan" }).click();
    await expect(page.getByText(looseTitle)).toBeVisible({ timeout: 60_000 });

    await expectBudgetTotalSpent(page, 1500);
    await expectBudgetRemaining(page, totalBudget - 1500);
  });
});
