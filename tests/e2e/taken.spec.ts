import { test, expect } from "@playwright/test";
import { killTour, loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import { expectBudgetTotalSpent } from "./helpers/budget";
import {
  addLooseExpense,
  addRoom,
  addTaskToRoom,
  createProjectAndSelect,
  getProjectRoomCard,
  openDashboard,
  openProjectOverview,
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
    await openProjectOverview(page);
    await addTaskToRoom(page, roomName, taskTitle, { actualCost: "750" });

    await expect(getProjectRoomCard(page, roomName).getByText(taskTitle, { exact: true })).toBeVisible();
  });

  test("taak aanmaken met meerdere ruimtes werkt", async ({ page }, testInfo) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");

    const projectName = uniqueName("PW Taken Multi", testInfo);
    const roomOne = uniqueName("Woonkamer", testInfo);
    const roomTwo = uniqueName("Hal", testInfo);
    const taskTitle = uniqueName("Stucwerk", testInfo);

    await loginAsTestUser(page);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "25000" });
    await addRoom(page, roomOne);
    await addRoom(page, roomTwo);
    await openProjectOverview(page);
    await addTaskToRoom(page, roomOne, taskTitle, {
      estimatedCost: "1800",
      extraRooms: [roomTwo],
    });

    await expect(getProjectRoomCard(page, roomOne).getByText(taskTitle, { exact: true })).toBeVisible();
    await expect(getProjectRoomCard(page, roomTwo).getByText(taskTitle, { exact: true })).toBeVisible();
  });

  test("taak verwijderen haalt gekoppelde kosten uit het budget", async ({ page }, testInfo) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");

    const projectName = uniqueName("PW Taken Delete", testInfo);
    const roomName = uniqueName("Zolder", testInfo);
    const taskTitle = uniqueName("Elektra", testInfo);
    const looseTitle = uniqueName("Losse uitgave", testInfo);

    await loginAsTestUser(page);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "50000" });
    await addRoom(page, roomName);
    await openProjectOverview(page);
    await addTaskToRoom(page, roomName, taskTitle, { actualCost: "1000" });

    await openDashboard(page);
    await killTour(page);
    await expectBudgetTotalSpent(page, 1000);

    await addLooseExpense(page, looseTitle, 500);
    await expectBudgetTotalSpent(page, 1500);

    await openProjectOverview(page);
    await killTour(page);
    const roomCard = getProjectRoomCard(page, roomName);
    const taskRow = roomCard.locator("li").filter({ hasText: taskTitle }).first();
    await killTour(page);
    await taskRow.getByRole("button", { name: "Bewerken" }).click();
    await taskRow.getByRole("button", { name: "Verwijderen" }).click();
    await expect(roomCard.getByText(taskTitle, { exact: true })).not.toBeVisible({ timeout: 60_000 });

    await openDashboard(page);
    await killTour(page);
    await expectBudgetTotalSpent(page, 500);
    await expect(page.getByText(looseTitle, { exact: true })).toBeVisible();
  });
});
