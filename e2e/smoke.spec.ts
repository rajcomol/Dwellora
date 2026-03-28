import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("login page shows sign-in heading", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});
