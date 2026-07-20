import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import { createProjectAndSelect, openDashboard, uniqueName } from "./helpers/dashboard";

test.describe("dashboard", () => {
  test("dashboard laadt met kerncijfers en budgetverdeling", async ({ page }, testInfo) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");

    const projectName = uniqueName("PW Dashboard", testInfo);

    await loginAsTestUser(page);
    await createProjectAndSelect(page, {
      name: projectName,
      ownContribution: "30000",
      constructionDepotTotal: "12000",
    });

    await openDashboard(page);

    await expect(page.getByRole("heading", { name: "Jouw renovatie-overzicht" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Kerncijfers" })).toBeVisible();
    await expect(page.getByText("Taken", { exact: true })).toBeVisible();
    await expect(page.getByText("Budget resterend", { exact: true })).toBeVisible();
    await expect(page.getByText("Bouwdepot over", { exact: true })).toBeVisible();
    await expect(page.getByTestId("dashboard-key-date-stat")).toBeVisible();

    await expect(page.getByText("Eigen geld", { exact: true })).toBeVisible();
    await expect(page.getByText("Bouwdepot", { exact: true })).toBeVisible();
    await expect(page.getByTestId("budget-total-spent")).toBeVisible();
  });
});
