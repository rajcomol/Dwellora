import { test, expect, type Page } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import { createProjectAndSelect, gotoProjectPath, uniqueName } from "./helpers/dashboard";

// 1x1 PNG zodat de tests geen externe afbeeldingen of OpenAI-calls nodig hebben.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const TINY_PNG_DATA_URL = `data:image/png;base64,${TINY_PNG_BASE64}`;
const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_BASE64, "base64");

const MOCK_FOLDER = "test-folder-abc123";

const MOCK_VISUALISATIE = {
  url: TINY_PNG_DATA_URL,
  folder: MOCK_FOLDER,
  version: 1,
};

const MOCK_REFINE = {
  url: TINY_PNG_DATA_URL,
  version: 2,
};

async function openPlannerPage(page: Page): Promise<void> {
  await gotoProjectPath(page, "/dashboard/planner");
  await expect(page.getByRole("heading", { name: "Maak je nieuwe situatie" })).toBeVisible({ timeout: 60_000 });
}

async function uploadPhoto(page: Page, testid: string, fileName: string): Promise<void> {
  await page.locator(`[data-testid="${testid}"] input[type="file"]`).setInputFiles({
    name: fileName,
    mimeType: "image/png",
    buffer: TINY_PNG_BUFFER,
  });
}

async function mockVisualisatieApis(page: Page): Promise<void> {
  await page.route("**/api/planner/visualiseer", async (route) => {
    if (route.request().url().includes("/verfijn")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_REFINE),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_VISUALISATIE),
    });
  });

  await page.route("**/api/planner/visualiseer/verfijn", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_REFINE),
    });
  });
}

test.describe("AI Kamervisualisatie", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("pagina laadt met basisfoto, optionele referenties en beschrijving", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Visual", testInfo);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });

    await openPlannerPage(page);

    await expect(page.getByTestId("render-canvas-heading")).toHaveText("Jouw nieuwe situatie");
    await expect(page.getByTestId("render-empty-state")).toBeVisible();
    await expect(page.getByTestId("render-empty-state")).toContainText("Upload je huidige situatie");

    await expect(page.getByTestId("planner-step1-title")).toHaveText("Stap 1: Je situatie opzetten");

    await expect(page.getByTestId("upload-basis")).toBeVisible();
    await expect(page.getByTestId("upload-basis").getByText("Jouw huidige situatie", { exact: true })).toBeVisible();
    await expect(page.getByTestId("reference-photos-section")).toBeVisible();
    await expect(page.getByTestId("add-reference-photo")).toBeVisible();

    const beschrijving = page.getByTestId("planner-beschrijving");
    await expect(beschrijving).toBeVisible();
    await beschrijving.fill("Vervang de vloer door hout en maak het warmer");
    await expect(beschrijving).toHaveValue("Vervang de vloer door hout en maak het warmer");

    await expect(page.getByTestId("planner-generate")).toBeVisible();
    await expect(page.getByTestId("planner-generate")).toBeEnabled();
  });

  test("validatie blokkeert generatie zonder basisfoto", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Visual Validatie", testInfo);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });

    await openPlannerPage(page);

    await page.getByTestId("planner-generate").click();

    await expect(page.getByTestId("planner-error")).toContainText(
      "Upload minimaal een foto van je huidige situatie"
    );
  });

  test("genereren werkt met alleen basisfoto en beschrijving", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Visual Basis", testInfo);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });

    await mockVisualisatieApis(page);
    await openPlannerPage(page);

    await uploadPhoto(page, "upload-basis", "situatie.png");
    await page.getByTestId("planner-beschrijving").fill("Maak de gevel modern wit");
    await page.getByTestId("planner-generate").click();

    await expect(page.getByTestId("render-main")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("refine-panel")).toBeVisible();
    await expect(page.getByTestId("version-thumb")).toHaveCount(1);
  });

  test("referentiefoto's zijn optioneel en kunnen worden toegevoegd", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Visual Refs", testInfo);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });

    await openPlannerPage(page);

    await page.getByTestId("add-reference-photo").click();
    await page.getByTestId("reference-file-input").setInputFiles({
      name: "deur.png",
      mimeType: "image/png",
      buffer: TINY_PNG_BUFFER,
    });

    await expect(page.getByTestId("reference-photo")).toHaveCount(1);
    await page.getByTestId("reference-note").fill("houtkleur deur");
    await expect(page.getByTestId("reference-note")).toHaveValue("houtkleur deur");
  });

  test("na generatie verschijnt bijstuur-blok en versiehistorie", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Visual Render", testInfo);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });

    await mockVisualisatieApis(page);
    await openPlannerPage(page);

    await uploadPhoto(page, "upload-basis", "situatie.png");
    await page.getByTestId("planner-generate").click();

    await expect(page.getByTestId("render-main")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("refine-panel")).toBeVisible();
    await expect(page.getByTestId("refine-input")).toBeVisible();
    await expect(page.getByTestId("refine-submit")).toBeVisible();
    await expect(page.getByTestId("planner-step2-title")).toHaveText("Stap 2: Bijsturen op het resultaat");
    await expect(page.getByTestId("version-label")).toHaveText("v1");

    await page.getByTestId("render-main").click();
    await expect(page.getByTestId("render-fullscreen")).toBeVisible();
    await page.getByRole("button", { name: "Sluiten" }).click();
  });

  test("bijsturing voegt versie toe en oudere versie kan opnieuw actief worden", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Visual Refine", testInfo);
    await createProjectAndSelect(page, { name: projectName, ownContribution: "20000" });

    await mockVisualisatieApis(page);
    await openPlannerPage(page);

    await uploadPhoto(page, "upload-basis", "situatie.png");
    await page.getByTestId("planner-generate").click();
    await expect(page.getByTestId("render-main")).toBeVisible({ timeout: 30_000 });

    await page.getByTestId("refine-input").fill("maak de muur warmer");
    await page.getByTestId("refine-submit").click();

    await expect(page.getByTestId("version-thumb")).toHaveCount(2, { timeout: 30_000 });
    await expect(page.getByTestId("version-label").nth(1)).toHaveText("v2");

    await page.getByTestId("version-thumb").first().click();
    await expect(page.getByTestId("version-thumb").first()).toHaveAttribute("aria-pressed", "true");
  });
});
