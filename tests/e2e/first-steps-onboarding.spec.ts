import { test, expect } from "@playwright/test";
import {
  loginAsTestUser,
  requireTestCredentials,
  testUserCredentialsConfigured,
  waitForDashboardAppReady,
} from "./helpers/auth";
import { createProjectAndSelect, openDashboard, uniqueName } from "./helpers/dashboard";
import { resetFirstStepsOnboardingForTestUser } from "./helpers/first-steps";

test.describe("eerste stappen onboarding", () => {
  test.beforeEach(async () => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    const { email } = requireTestCredentials();
    const reset = await resetFirstStepsOnboardingForTestUser(email);
    if (!reset) {
      throw new Error(
        "Kon first-steps onboarding niet resetten (SUPABASE_SERVICE_ROLE_KEY / testuser vereist)."
      );
    }
  });

  test("begeleidt nieuwe gebruiker door kamer, taak en kostenpost", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const projectName = uniqueName("PW First Steps", testInfo);
    const roomName = uniqueName("Keuken", testInfo);
    const taskTitle = uniqueName("Schilderen", testInfo);
    const expenseTitle = uniqueName("Verf", testInfo);

    await loginAsTestUser(page);
    await createProjectAndSelect(page, {
      name: projectName,
      ownContribution: "25000",
    });

    await openDashboard(page);
    const card = page.getByTestId("first-steps-card");
    await expect(card).toBeVisible({ timeout: 60_000 });
    await expect(card.getByRole("heading", { name: "Je eerste stappen" })).toBeVisible();
    await expect(page.getByTestId("first-steps-step-project")).toHaveAttribute("data-done", "true");
    await expect(page.getByTestId("first-steps-step-room")).toHaveAttribute("data-done", "false");

    await card.getByRole("link", { name: "Naar Ruimtes" }).click();
    await page.waitForURL(/\/dashboard\/rooms/, { timeout: 60_000 });
    await expect(page.getByLabel("Nieuwe ruimte")).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("Nieuwe ruimte").fill(roomName);
    await page.getByRole("button", { name: "Opslaan" }).click();
    await expect(page.getByTestId("rooms-overview-card").filter({ hasText: roomName })).toBeVisible({
      timeout: 60_000,
    });

    await openDashboard(page);
    await expect(page.getByTestId("first-steps-step-room")).toHaveAttribute("data-done", "true", {
      timeout: 60_000,
    });
    await expect(page.getByTestId("first-steps-step-task")).toHaveAttribute("data-done", "false");

    await page.getByTestId("first-steps-card").getByRole("link", { name: "Taak toevoegen" }).click();
    await page.waitForURL(/\/dashboard\/rooms\/[^/?]+/, { timeout: 60_000 });
    const taskForm = page.getByTestId("room-task-form");
    await expect(taskForm).toBeVisible({ timeout: 60_000 });
    await taskForm.getByPlaceholder("Korte titel van de taak").fill(taskTitle);
    await taskForm.getByRole("button", { name: "Opslaan" }).click();
    await expect(page.getByText(taskTitle, { exact: true })).toBeVisible({ timeout: 60_000 });

    await openDashboard(page);
    await expect(page.getByTestId("first-steps-step-task")).toHaveAttribute("data-done", "true", {
      timeout: 60_000,
    });
    await expect(page.getByTestId("first-steps-step-expense")).toHaveAttribute("data-done", "false");

    await page.getByTestId("first-steps-card").getByRole("link", { name: "Naar Financiën" }).click();
    await page.waitForURL(/\/dashboard\/finances/, { timeout: 60_000 });
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await dialog.getByLabel("Omschrijving").fill(expenseTitle);
    await dialog.getByTestId("kosten-field-bedrag").fill("150");
    await dialog.getByRole("button", { name: "Opslaan" }).click();
    await expect(page.getByText(expenseTitle, { exact: true })).toBeVisible({ timeout: 60_000 });

    await openDashboard(page);
    await expect(page.getByTestId("first-steps-completion")).toBeVisible({ timeout: 60_000 });
    await page.getByTestId("first-steps-tour-no").click();
    await expect(page.getByTestId("first-steps-card")).toBeHidden({ timeout: 30_000 });

    await page.reload();
    await waitForDashboardAppReady(page);
    await expect(page.getByTestId("first-steps-card")).toHaveCount(0, { timeout: 30_000 });
  });
});
