import { test } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import { expectBudgetRemaining, expectBudgetTotalSpent } from "./helpers/budget";
import {
  addLooseExpense,
  addRoom,
  addTaskToRoom,
  createProjectAndSelect,
  openDashboard,
  openProjectOverview,
  uniqueName,
} from "./helpers/dashboard";

test.describe("budget remaining stat", () => {
  test("shows total budget minus spent and drops when adding a loose expense", async ({ page }, testInfo) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");

    const projectName = uniqueName("PW Budget", testInfo);
    const roomName = uniqueName("Ruimte", testInfo);
    const taskTitle = uniqueName("Taak", testInfo);
    const looseTitle = uniqueName("Losse uitgave", testInfo);
    const totalBudget = 50_000;

    await loginAsTestUser(page);
    await createProjectAndSelect(page, {
      name: projectName,
      ownContribution: String(totalBudget),
      constructionDepotTotal: "0",
    });
    await addRoom(page, roomName);
    await openProjectOverview(page);
    await addTaskToRoom(page, roomName, taskTitle, { actualCost: "1000" });

    await openDashboard(page);
    await expectBudgetTotalSpent(page, 1000);
    await expectBudgetRemaining(page, totalBudget - 1000);

    await addLooseExpense(page, looseTitle, 500);
    await expectBudgetTotalSpent(page, 1500);
    await expectBudgetRemaining(page, totalBudget - 1500);
  });
});
