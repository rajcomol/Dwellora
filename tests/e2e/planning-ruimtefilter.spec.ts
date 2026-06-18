import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import {
  addRoom,
  addTaskToRoom,
  createProjectAndSelect,
  openPlanningPage,
  uniqueName,
} from "./helpers/dashboard";

test.describe("planning ruimtefilter", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("filtert taken en groepeert per ruimte in de Gantt", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Gantt is desktop-only in hub");

    const projectName = uniqueName("PW Room Filter", testInfo);
    const roomA = uniqueName("Keuken", testInfo);
    const roomB = uniqueName("Badkamer", testInfo);
    const taskA1 = uniqueName("Sloop A1", testInfo);
    const taskA2 = uniqueName("Tegels A2", testInfo);
    const taskB1 = uniqueName("Leiding B1", testInfo);
    const taskB2 = uniqueName("Afwerking B2", testInfo);

    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });
    await addRoom(page, roomA);
    await addRoom(page, roomB);
    await addTaskToRoom(page, roomA, taskA1, { durationDays: "2" });
    await addTaskToRoom(page, roomA, taskA2, { durationDays: "3" });
    await addTaskToRoom(page, roomB, taskB1, { durationDays: "1" });
    await addTaskToRoom(page, roomB, taskB2, { durationDays: "4" });

    await openPlanningPage(page);

    const filter = page.getByTestId("planning-room-filter");
    await expect(filter).toBeVisible();
    await expect(filter).toHaveValue("");

    const gantt = page.getByTestId("planning-gantt");
    await expect(gantt.getByTestId("planning-gantt-row").filter({ hasText: taskA1 })).toBeVisible();
    await expect(gantt.getByTestId("planning-gantt-row").filter({ hasText: taskA2 })).toBeVisible();
    await expect(gantt.getByTestId("planning-gantt-row").filter({ hasText: taskB1 })).toBeVisible();
    await expect(gantt.getByTestId("planning-gantt-row").filter({ hasText: taskB2 })).toBeVisible();

    const headers = gantt.getByTestId("planning-gantt-room-header");
    await expect(headers.filter({ hasText: roomA })).toBeVisible();
    await expect(headers.filter({ hasText: roomB })).toBeVisible();

    await filter.selectOption({ label: roomA });

    await expect(gantt.getByTestId("planning-gantt-row").filter({ hasText: taskA1 })).toBeVisible();
    await expect(gantt.getByTestId("planning-gantt-row").filter({ hasText: taskA2 })).toBeVisible();
    await expect(gantt.getByTestId("planning-gantt-row").filter({ hasText: taskB1 })).toHaveCount(0);
    await expect(gantt.getByTestId("planning-gantt-row").filter({ hasText: taskB2 })).toHaveCount(0);
    await expect(headers.filter({ hasText: roomA })).toBeVisible();
    await expect(headers.filter({ hasText: roomB })).toHaveCount(0);
  });
});
