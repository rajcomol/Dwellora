import { test, expect, type Page } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured, waitForDashboardAppReady } from "./helpers/auth";

async function openKluscoach(page: Page): Promise<void> {
  const fab = page.getByTestId("kluscoach-fab");
  await fab.scrollIntoViewIfNeeded();
  await expect(fab).toBeVisible({ timeout: 30_000 });
  await fab.click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 30_000 });
}

async function sendMessage(page: Page, text: string): Promise<void> {
  const input = page.getByLabel("Bericht", { exact: true });
  await expect(input).toBeVisible({ timeout: 30_000 });
  await input.fill(text);
  await page.getByRole("button", { name: "Versturen" }).click();
}

test.describe("Kluscoach foutafhandeling", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
    await page.goto("/dashboard");
    await waitForDashboardAppReady(page);
  });

  test("toont een rustige melding bij een serverfout (500), geen rauwe servertekst", async ({ page }) => {
    // Alleen de POST (versturen) faalt; GET (threads laden) laten we doorgaan.
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "text/plain",
          body: "Internal Server Error: stacktrace boem OpenAI 500",
        });
        return;
      }
      await route.continue();
    });

    await openKluscoach(page);
    await sendMessage(page, "Hoe plan ik mijn badkamer?");

    await expect(page.getByText("Er ging iets mis bij het versturen. Probeer het zo nog eens.")).toBeVisible({
      timeout: 30_000,
    });
    // Rauwe servertekst mag NOOIT in de chat-UI belanden (scoped: Next.dev overlay
    // kan console.error-tekst elders op de pagina tonen).
    await expect(page.getByRole("dialog").getByText(/stacktrace|Internal Server Error|OpenAI 500/)).toHaveCount(
      0
    );
  });

  test("toont een rustige melding wanneer de sessie verlopen is (401)", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Unauthorized." }),
        });
        return;
      }
      await route.continue();
    });

    await openKluscoach(page);
    await sendMessage(page, "Wat kost een nieuwe keuken ongeveer?");

    await expect(page.getByText("Je bent even niet meer ingelogd. Log opnieuw in om verder te chatten.")).toBeVisible({
      timeout: 30_000,
    });
  });
});
