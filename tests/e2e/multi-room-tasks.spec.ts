import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import {
  addRoom,
  addTaskToRoom,
  createProjectAndSelect,
  openRoomDetail,
  setTaskRooms,
  uniqueName,
} from "./helpers/dashboard";

test.describe("multi-ruimte taken", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("gedeelde taak verschijnt in beide ruimtes, status sync en ontkoppelen", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Multi Room", testInfo);
    const roomA = uniqueName("Keuken", testInfo);
    const roomB = uniqueName("Badkamer", testInfo);
    const taskTitle = uniqueName("Vloerverwarming", testInfo);

    await createProjectAndSelect(page, { name: projectName, ownContribution: "30000" });
    await addRoom(page, roomA);
    await addRoom(page, roomB);
    await addTaskToRoom(page, roomA, taskTitle, { extraRooms: [roomB] });

    const taskInRoomA = page.getByTestId("room-task-item").filter({ hasText: taskTitle });
    await expect(taskInRoomA.getByTestId("shared-task-badge")).toContainText(`Gedeeld · ook in ${roomB}`);

    await openRoomDetail(page, roomB);
    const taskInRoomB = page.getByTestId("room-task-item").filter({ hasText: taskTitle });
    await expect(taskInRoomB).toBeVisible({ timeout: 60_000 });
    await expect(taskInRoomB.getByTestId("shared-task-badge")).toContainText(`Gedeeld · ook in ${roomA}`);

    await taskInRoomB.getByRole("button", { name: "Bewerken" }).click();
    await taskInRoomB.getByLabel("Status").selectOption("doing");
    await taskInRoomB.getByRole("button", { name: "Opslaan" }).click();
    await expect(taskInRoomB.getByText("Bezig")).toBeVisible({ timeout: 60_000 });

    await openRoomDetail(page, roomA);
    const taskBackInA = page.getByTestId("room-task-item").filter({ hasText: taskTitle });
    await expect(taskBackInA.getByText("Bezig")).toBeVisible({ timeout: 60_000 });

    await taskBackInA.getByRole("button", { name: "Bewerken" }).click();
    await setTaskRooms(taskBackInA, [roomB], [roomA, roomB]);
    await taskBackInA.getByRole("button", { name: "Opslaan" }).click();
    await expect(page.getByTestId("room-task-item").filter({ hasText: taskTitle })).toHaveCount(0, {
      timeout: 60_000,
    });

    await openRoomDetail(page, roomB);
    const taskOnlyInB = page.getByTestId("room-task-item").filter({ hasText: taskTitle });
    await expect(taskOnlyInB).toBeVisible({ timeout: 60_000 });
    await expect(taskOnlyInB.getByTestId("shared-task-badge")).toHaveCount(0);
    await expect(taskOnlyInB.getByText("Bezig")).toBeVisible();
  });
});
