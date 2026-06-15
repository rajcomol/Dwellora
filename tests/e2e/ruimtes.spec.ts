import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import {
  createProjectAndSelect,
  getRoomOverviewCard,
  openProjectSettings,
  openRoomsPage,
  uniqueName,
} from "./helpers/dashboard";

test.describe("ruimtes herinrichting", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("toont direct ruimteraster zonder subtabs, lege staat en checklist in instellingen", async ({
    page,
  }, testInfo) => {
    const projectName = uniqueName("PW Ruimtes Hub", testInfo);
    const roomName = uniqueName("Keuken", testInfo);

    await createProjectAndSelect(page, { name: projectName, ownContribution: "15000" });
    await openRoomsPage(page);

    await expect(page.getByTestId("rooms-page")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("nav-tab-projectoverzicht")).toHaveCount(0);
    await expect(page.getByTestId("nav-tab-ruimtes")).toHaveCount(0);
    await expect(page.getByTestId("rooms-empty-state")).toBeVisible();
    await expect(page.getByText("Begin met je eerste ruimte")).toBeVisible();

    await page.getByTestId("rooms-empty-create-button").click();
    await page.getByLabel("Nieuwe ruimte").fill(roomName);
    await page.getByRole("button", { name: "Opslaan" }).click();

    const roomCard = getRoomOverviewCard(page, roomName);
    await expect(roomCard).toBeVisible({ timeout: 60_000 });
    await expect(roomCard.getByTestId("rooms-add-task-link")).toBeVisible();

    await roomCard.click();
    await page.waitForURL(/\/dashboard\/rooms\/[^/?]+/, { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: roomName })).toBeVisible();

    await openRoomsPage(page);
    await expect(page.getByTestId("rooms-grid")).toBeVisible();

    await openProjectSettings(page);
    await page.getByTestId("settings-tab-oplevering").click();
    await expect(page.getByTestId("settings-key-handover-checklist")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Checklist sleuteloverdracht")).toBeVisible();

    await openRoomsPage(page);
    await expect(page.getByTestId("settings-key-handover-checklist")).toHaveCount(0);
  });
});
