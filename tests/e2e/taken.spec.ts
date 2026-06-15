import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import {
  addRoom,
  addTaskToRoom,
  createProjectAndSelect,
  getProjectRoomCard,
  openRoomDetail,
  openRoomsPage,
  uniqueName,
} from "./helpers/dashboard";

test.describe("taken", () => {
  test("taak aanmaken met een ruimte werkt", async ({ page }, testInfo) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");

    const projectName = uniqueName("PW Taken Single", testInfo);
    const roomName = uniqueName("Keuken", testInfo);
    const taskTitle = uniqueName("Schilderen", testInfo);

    await loginAsTestUser(page);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });
    await addRoom(page, roomName);
    await addTaskToRoom(page, roomName, taskTitle);

    await openRoomsPage(page);
    await expect(getProjectRoomCard(page, roomName).getByText(taskTitle, { exact: true })).toBeVisible();
  });

  test("taak verwijderen op ruimte-detail werkt", async ({ page }, testInfo) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");

    const projectName = uniqueName("PW Taken Delete", testInfo);
    const roomName = uniqueName("Zolder", testInfo);
    const taskTitle = uniqueName("Elektra", testInfo);

    await loginAsTestUser(page);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "50000" });
    await addRoom(page, roomName);
    await addTaskToRoom(page, roomName, taskTitle);

    await openRoomDetail(page, roomName);
    const taskRow = page.locator("li").filter({ hasText: taskTitle }).first();
    await taskRow.getByRole("button", { name: "Verwijderen" }).click();
    await expect(page.getByText(taskTitle, { exact: true })).not.toBeVisible({ timeout: 60_000 });
  });
});
