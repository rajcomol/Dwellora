import { test } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import { expectBudgetRemaining, expectBudgetTotalSpent } from "./helpers/budget";
import {
  addLooseExpense,
  createProjectAndSelect,
  openDashboard,
  uniqueName,
} from "./helpers/dashboard";

test.describe("budget remaining stat", () => {
  test("shows total budget minus spent and drops when adding a loose expense", async ({ page }, testInfo) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");

    const projectName = uniqueName("PW Budget", testInfo);
    const looseTitle = uniqueName("Losse uitgave", testInfo);
    const totalBudget = 50_000;

    await loginAsTestUser(page);
    await createProjectAndSelect(page, {
      name: projectName,
      ownContribution: String(totalBudget),
      constructionDepotTotal: "0",
    });

    await openDashboard(page);
    await expectBudgetTotalSpent(page, 0);
    await expectBudgetRemaining(page, totalBudget);

    await addLooseExpense(page, looseTitle, 500);
    await expectBudgetTotalSpent(page, 500);
    await expectBudgetRemaining(page, totalBudget - 500);
  });
});
