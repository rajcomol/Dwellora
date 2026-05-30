import { test, expect, type Page } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import { createProjectAndSelect, gotoProjectPath, uniqueName } from "./helpers/dashboard";

// 1x1 PNG als render-fixture zodat de test geen externe afbeeldingen of OpenAI nodig heeft.
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const MOCK_VISUALISATIE = {
  renders: [
    { url: TINY_PNG, hoek: "overzicht" },
    { url: TINY_PNG, hoek: "hoek" },
    { url: TINY_PNG, hoek: "detail" },
  ],
  panorama: TINY_PNG,
};

async function openPlannerPage(page: Page): Promise<void> {
  await gotoProjectPath(page, "/dashboard/planner");
  await expect(page.getByRole("heading", { name: "3D Planner" })).toBeVisible({ timeout: 60_000 });
}

test.describe("AI Kamervisualisatie", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("pagina laadt, beschrijving invulbaar, presets en genereer knop aanwezig", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Visual", testInfo);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });

    await openPlannerPage(page);

    // Beschrijving veld zichtbaar en invulbaar
    const beschrijving = page.getByTestId("planner-beschrijving");
    await expect(beschrijving).toBeVisible();
    await beschrijving.fill("Een lichte moderne woonkamer met grote ramen");
    await expect(beschrijving).toHaveValue("Een lichte moderne woonkamer met grote ramen");

    // Stijl-preset vult de beschrijving in
    await page.getByRole("button", { name: "Scandinavisch" }).click();
    await expect(beschrijving).not.toHaveValue("");

    // Genereer knop aanwezig
    await expect(page.getByTestId("planner-generate")).toBeVisible();
    await expect(page.getByTestId("planner-generate")).toBeEnabled();
  });

  test("na generatie is de render galerij zichtbaar en werkt de 360°-view", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Visual Render", testInfo);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });

    // Visualisatie-API mocken (geen echte DALL-E call).
    await page.route("**/api/planner/visualiseer", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_VISUALISATIE),
      });
    });

    await openPlannerPage(page);

    await page.getByTestId("planner-beschrijving").fill("Moderne woonkamer met licht eiken vloer");
    await page.getByTestId("planner-generate").click();

    // Render galerij zichtbaar
    await expect(page.getByTestId("render-image")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("render-label")).toContainText("Overzicht");

    // Bladeren door renders
    await page.getByTestId("render-next").click();
    await expect(page.getByTestId("render-label")).toContainText("Hoekperspectief");

    // 360°-view openen
    const view360 = page.getByTestId("open-360");
    await expect(view360).toBeEnabled();
    await view360.click();
    await expect(page.getByTestId("panorama-modal")).toBeVisible();

    // Sluiten
    await page.getByTestId("panorama-close").click();
    await expect(page.getByTestId("panorama-modal")).toBeHidden();
  });
});
