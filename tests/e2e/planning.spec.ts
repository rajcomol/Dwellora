import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import {
  addRoom,
  addTaskToRoom,
  createProjectAndSelect,
  openPlanningPage,
  openProjectOverview,
  uniqueName,
} from "./helpers/dashboard";

async function seedPlanningTask(
  page: Parameters<typeof loginAsTestUser>[0],
  projectName: string,
  roomName: string,
  taskTitle: string
): Promise<void> {
  await createProjectAndSelect(page, { name: projectName, ownContribution: "22000" });
  await addRoom(page, roomName);
  await openProjectOverview(page);
  await addTaskToRoom(page, roomName, taskTitle, {
    estimatedCost: "1200",
    startDate: "2026-06-15",
    durationDays: "3",
  });
}

test.describe("planning", () => {
  test("planning pagina laadt en toont de gantt tijdlijn", async ({ page }, testInfo) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    test.skip(testInfo.project.name !== "chromium", "Desktop timeline assertion");

    const projectName = uniqueName("PW Planning", testInfo);
    const roomName = uniqueName("Badkamer", testInfo);
    const taskTitle = uniqueName("Tegelzetten", testInfo);

    await loginAsTestUser(page);
    await seedPlanningTask(page, projectName, roomName, taskTitle);

    await openPlanningPage(page);

    await expect(page.getByTestId("planning-gantt")).toBeVisible();
    await expect(page.getByText(taskTitle, { exact: true }).first()).toBeVisible();
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("planning toont lijstweergave op mobiel viewport", async ({ page }, testInfo) => {
      test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");

      const projectName = uniqueName("PW Planning Mobile", testInfo);
      const roomName = uniqueName("Slaapkamer", testInfo);
      const taskTitle = uniqueName("Verven", testInfo);

      await loginAsTestUser(page);
      await seedPlanningTask(page, projectName, roomName, taskTitle);

      await openPlanningPage(page);

      await expect(page.getByTestId("planning-task-list")).toBeVisible();
      await expect(
        page.getByTestId("planning-task-list").getByText(taskTitle, { exact: true }).first()
      ).toBeVisible();
    });
  });
});
