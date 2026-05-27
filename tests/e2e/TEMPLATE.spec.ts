import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";

test.describe("[Feature naam]", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("should [wat het moet doen]", async ({ page }) => {
    // Arrange
    await page.goto("/dashboard/...");

    // Act
    await page.click("...");

    // Assert
    await expect(page.locator("...")).toBeVisible();
  });
});
