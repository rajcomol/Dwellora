import { test, expect } from "@playwright/test";
import { e2eCredentialsConfigured, loginAsE2eUser, selectProjectByName } from "./helpers/auth";

test.describe("reports by room", () => {
  test("lists all rooms including rooms without tasks", async ({ page }) => {
    test.skip(!e2eCredentialsConfigured, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD");

    const stamp = Date.now();
    const projectName = `E2E rapport ${stamp}`;
    const roomWithTask = `Ruimte A ${stamp}`;
    const roomEmpty = `Ruimte B ${stamp}`;

    await loginAsE2eUser(page);

    await page.goto("/dashboard/projects");
    await page.getByLabel("Projectnaam").fill(projectName);
    await page.getByLabel("Eigen geld").fill("40000");
    await page.getByRole("button", { name: "Project aanmaken" }).click();
    await expect(page.getByText(projectName, { exact: true })).toBeVisible({ timeout: 60_000 });

    await selectProjectByName(page, projectName);

    await page.goto("/dashboard/rooms?tab=overzicht");
    for (const name of [roomWithTask, roomEmpty]) {
      await page.getByLabel("Ruimtenaam").fill(name);
      await page.getByRole("button", { name: "Ruimte toevoegen" }).click();
      await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 60_000 });
    }

    const roomCard = page.locator("div.rounded-xl").filter({ hasText: roomWithTask }).first();
    await roomCard.getByLabel("Taaktitel").fill(`Taak ${stamp}`);
    await roomCard.getByRole("button", { name: "Taak toevoegen" }).click();
    await expect(roomCard.getByText(`Taak ${stamp}`)).toBeVisible({ timeout: 60_000 });

    await page.goto("/dashboard/reports");
    await page.getByLabel("Bereik").selectOption({ label: projectName });

    const table = page.getByTestId("reports-by-room");
    await expect(table).toBeVisible({ timeout: 60_000 });
    await expect(table.getByRole("cell", { name: roomWithTask, exact: true })).toBeVisible();
    await expect(table.getByRole("cell", { name: roomEmpty, exact: true })).toBeVisible();
  });
});
