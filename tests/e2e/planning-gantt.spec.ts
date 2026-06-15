import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import {
  addRoom,
  addTaskToRoom,
  createProjectAndSelect,
  openPlanningPage,
  uniqueName,
} from "./helpers/dashboard";

test.describe("planning hub gantt", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("zonder planningsstart: melding en geen balken", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Gantt is desktop-only in hub");

    const projectName = uniqueName("PW Gantt Empty", testInfo);
    const roomName = uniqueName("Keuken", testInfo);
    const taskTitle = uniqueName("Afbouwen", testInfo);

    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });
    await addRoom(page, roomName);
    await addTaskToRoom(page, roomName, taskTitle, { durationDays: "2" });

    await openPlanningPage(page);

    await expect(page.getByTestId("planning-start-date")).toBeVisible();
    await expect(page.getByTestId("planning-gantt-no-start")).toBeVisible();
    await expect(page.getByTestId("planning-gantt-bar")).toHaveCount(0);
    await expect(page.getByTestId("planning-gantt-day-label").first()).toHaveText("Dagen 1–2");
  });

  test("met planningsstart: balken en eerste taak op startdatum", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Gantt is desktop-only in hub");

    const projectName = uniqueName("PW Gantt Bars", testInfo);
    const roomName = uniqueName("Badkamer", testInfo);
    const taskTitle = uniqueName("Tegels", testInfo);
    const planningStart = "2026-06-15";

    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });
    await addRoom(page, roomName);
    await addTaskToRoom(page, roomName, taskTitle, { durationDays: "3" });

    await openPlanningPage(page);

    await expect(page.getByTestId("planning-start-date")).toBeVisible();
    await page.getByTestId("planning-start-date").fill(planningStart);

    await expect(page.getByTestId("planning-gantt-no-start")).toHaveCount(0);
    await expect(page.getByTestId("planning-gantt-bar").first()).toBeVisible({ timeout: 60_000 });

    const firstRow = page.getByTestId("planning-gantt-row").filter({ hasText: taskTitle });
    await expect(firstRow.getByTestId("planning-gantt-bar")).toBeVisible();
  });
});
