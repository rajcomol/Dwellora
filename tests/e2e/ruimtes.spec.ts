import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import { createProjectAndSelect, getRoomOverviewCard, openRoomsPage, uniqueName } from "./helpers/dashboard";

test.describe("ruimtes", () => {
  test("ruimtes pagina toont kaarten, nieuwe ruimte en subtabs", async ({ page }, testInfo) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");

    const projectName = uniqueName("PW Ruimtes", testInfo);
    const roomName = uniqueName("Woonkamer", testInfo);

    await loginAsTestUser(page);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "15000" });

    await openRoomsPage(page);

    await expect(page.getByRole("heading", { name: "Ruimtes" })).toBeVisible();
    await page.getByRole("button", { name: "Nieuwe ruimte" }).click();
    await page.getByLabel("Nieuwe ruimte").fill(roomName);
    await page.getByRole("button", { name: "Opslaan" }).click();

    await expect(getRoomOverviewCard(page, roomName)).toBeVisible({ timeout: 60_000 });

    await page.getByTestId("nav-tab-projectoverzicht").click();
    await expect(page.getByText("Projectgegevens", { exact: true })).toBeVisible();

    await page.getByTestId("nav-tab-ruimtes").click();
    await expect(page.getByRole("button", { name: "Nieuwe ruimte" })).toBeVisible({ timeout: 60_000 });
    await expect(getRoomOverviewCard(page, roomName)).toBeVisible();
  });
});
