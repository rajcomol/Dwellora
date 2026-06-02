import { test, expect, type Page } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import { createProjectAndSelect, gotoProjectPath, uniqueName } from "./helpers/dashboard";

// 1x1 PNG zodat de tests geen externe afbeeldingen of ReimagineHome/OpenAI nodig hebben.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const TINY_PNG_DATA_URL = `data:image/png;base64,${TINY_PNG_BASE64}`;
const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_BASE64, "base64");

const MOCK_VISUALISATIE = {
  renders: [
    { url: TINY_PNG_DATA_URL, hoek: "structuur" },
    { url: TINY_PNG_DATA_URL, hoek: "gebalanceerd" },
    { url: TINY_PNG_DATA_URL, hoek: "maximaal" },
  ],
};

async function openPlannerPage(page: Page): Promise<void> {
  await gotoProjectPath(page, "/dashboard/planner");
  await expect(page.getByRole("heading", { name: "3D Planner" })).toBeVisible({ timeout: 60_000 });
}

async function uploadPhoto(page: Page, testid: string, fileName: string): Promise<void> {
  await page.locator(`[data-testid="${testid}"] input[type="file"]`).setInputFiles({
    name: fileName,
    mimeType: "image/png",
    buffer: TINY_PNG_BUFFER,
  });
}

test.describe("AI Kamervisualisatie", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("pagina laadt met vier upload zones, extra wensen en genereer knop", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Visual", testInfo);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });

    await openPlannerPage(page);

    // Vier upload zones zichtbaar met de juiste labels.
    await expect(page.getByTestId("upload-kamer")).toBeVisible();
    await expect(page.getByTestId("upload-vloer")).toBeVisible();
    await expect(page.getByTestId("upload-muur")).toBeVisible();
    await expect(page.getByTestId("upload-tvwand")).toBeVisible();
    await expect(page.getByTestId("upload-kamer").getByText("Jouw huidige kamer", { exact: true })).toBeVisible();
    await expect(page.getByTestId("upload-vloer").getByText("Vloer of tegels", { exact: true })).toBeVisible();
    await expect(page.getByTestId("upload-muur").getByText("Muurkleur", { exact: true })).toBeVisible();
    await expect(page.getByTestId("upload-tvwand").getByText("Tv wand / Feature wall", { exact: true })).toBeVisible();

    // Extra wensen (optioneel) invulbaar.
    const beschrijving = page.getByTestId("planner-beschrijving");
    await expect(beschrijving).toBeVisible();
    await beschrijving.fill("Meer planten en warmer licht");
    await expect(beschrijving).toHaveValue("Meer planten en warmer licht");

    // Genereer knop aanwezig.
    await expect(page.getByTestId("planner-generate")).toBeVisible();
    await expect(page.getByTestId("planner-generate")).toBeEnabled();
  });

  test("validatie blokkeert generatie zonder kamerfoto", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Visual Validatie", testInfo);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });

    await openPlannerPage(page);

    await page.getByTestId("planner-generate").click();

    await expect(page.getByTestId("planner-error")).toContainText(
      "Upload minimaal een foto van je huidige kamer"
    );
  });

  test("na upload + generatie is de render galerij met 3 renders zichtbaar", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Visual Render", testInfo);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });

    // Visualisatie-API mocken (geen echte ReimagineHome/OpenAI call).
    await page.route("**/api/planner/visualiseer", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_VISUALISATIE),
      });
    });

    await openPlannerPage(page);

    // Verplichte kamerfoto uploaden.
    await uploadPhoto(page, "upload-kamer", "kamer.png");

    await page.getByTestId("planner-generate").click();

    // Render galerij toont 3 renders met de juiste labels.
    await expect(page.getByTestId("render-image")).toHaveCount(3, { timeout: 30_000 });
    const labels = page.getByTestId("render-label");
    await expect(labels.nth(0)).toContainText("Behoud structuur");
    await expect(labels.nth(1)).toContainText("Gebalanceerd");
    await expect(labels.nth(2)).toContainText("Maximale transformatie");

    // Klik op een render opent fullscreen.
    await page.getByTestId("render-image").first().click();
    await expect(page.getByTestId("render-fullscreen")).toBeVisible();
  });
});
