import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import {
  addRoom,
  addTaskToRoom,
  createProjectAndSelect,
  openProjectOverview,
  openReportsPage,
  uniqueName,
} from "./helpers/dashboard";

test.describe("reports by room", () => {
  test.skip(true, "Reports moved off unified finances page; restore when reports route returns.");

  test("lists all rooms including rooms without tasks", async ({ page }, testInfo) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");

    const projectName = uniqueName("PW Rapport", testInfo);
    const roomWithTask = uniqueName("Ruimte A", testInfo);
    const roomEmpty = uniqueName("Ruimte B", testInfo);
    const taskTitle = uniqueName("Rapport taak", testInfo);

    await loginAsTestUser(page);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "40000" });
    await addRoom(page, roomWithTask);
    await addRoom(page, roomEmpty);
    await openProjectOverview(page);
    await addTaskToRoom(page, roomWithTask, taskTitle, { estimatedCost: "250" });

    await openReportsPage(page);
    await page.getByTestId("reports-bereik-select").selectOption({ label: projectName });

    const table = page.getByTestId("reports-by-room");
    await expect(table).toBeVisible({ timeout: 60_000 });
    await expect(table.getByRole("cell", { name: roomWithTask, exact: true })).toBeVisible();
    await expect(table.getByRole("cell", { name: roomEmpty, exact: true })).toBeVisible();
  });
});
