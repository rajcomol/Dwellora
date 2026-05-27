import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";

const testUserEmail = process.env.TEST_USER_EMAIL?.trim() || process.env.E2E_USER_EMAIL?.trim() || "";

test.describe("auth", () => {
  test("login met correcte gegevens opent het dashboard", async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");

    await loginAsTestUser(page);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: "Jouw renovatie-overzicht" })).toBeVisible();
  });

  test("login met verkeerd wachtwoord toont een foutmelding", async ({ page }) => {
    test.skip(!testUserEmail.trim(), "Set TEST_USER_EMAIL");

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(testUserEmail);
    await page.getByLabel("Wachtwoord").fill("verkeerd-playwright-wachtwoord");
    await page.getByRole("button", { name: "Inloggen" }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 60_000 });
  });
});
