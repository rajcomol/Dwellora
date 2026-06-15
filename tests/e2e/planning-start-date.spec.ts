import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import {
  addRoom,
  addTaskToRoom,
  createProjectAndSelect,
  openProjectPlanningPage,
  openRoomDetail,
  uniqueName,
} from "./helpers/dashboard";

test.describe("planning start date", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("taakformulier heeft duur maar geen startdatum", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW PlanStart", testInfo);
    const roomName = uniqueName("Keuken", testInfo);

    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });
    await addRoom(page, roomName);
    await openRoomDetail(page, roomName);

    const form = page.getByTestId("room-task-form");
    await expect(form.getByLabel("Duur (dagen)")).toBeVisible();
    await expect(form.getByLabel("Startdatum")).toHaveCount(0);
  });

  test("taak met duur 3 toont dag 1–3 zonder planningsstart", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW PlanDays", testInfo);
    const roomName = uniqueName("Badkamer", testInfo);
    const taskTitle = uniqueName("Tegels", testInfo);

    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });
    await addRoom(page, roomName);
    await addTaskToRoom(page, roomName, taskTitle, { durationDays: "3" });

    await openProjectPlanningPage(page);

    await expect(page.getByTestId("planning-dates-hint-off")).toBeVisible();
    const row = page.getByTestId("planning-row").filter({ hasText: taskTitle });
    await expect(row.getByTestId("planning-day-label")).toHaveText("Dagen 1–3");
    await expect(row.getByTestId("planning-date-range")).toHaveCount(0);
  });

  test("planningsstart toont kalenderdatums; eerste taak start op die datum", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW PlanCal", testInfo);
    const roomName = uniqueName("Woonkamer", testInfo);
    const taskTitle = uniqueName("Schilderen", testInfo);
    const planningStart = "2026-06-15";

    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });
    await addRoom(page, roomName);
    await addTaskToRoom(page, roomName, taskTitle, { durationDays: "3" });

    await openProjectPlanningPage(page);

    await page.getByTestId("planning-start-date").fill(planningStart);
    await expect(page.getByTestId("planning-dates-hint-on")).toBeVisible({ timeout: 60_000 });

    const row = page.getByTestId("planning-row").filter({ hasText: taskTitle });
    await expect(row.getByTestId("planning-date-range")).toContainText("15-06-2026");
    await expect(row.getByTestId("planning-date-range")).toContainText("17-06-2026");
  });
});
