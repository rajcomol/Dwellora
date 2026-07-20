import { test, expect } from "@playwright/test";

test.describe("marketing landing", () => {
  test("toont hero en functies voor niet-ingelogde bezoekers", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("marketing-hero")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Jouw verbouwing, zonder de chaos" })).toBeVisible();

    await expect(page.getByTestId("marketing-features")).toBeVisible();
    await expect(page.getByTestId("marketing-feature-ruimtes")).toBeVisible();
    await expect(page.getByTestId("marketing-feature-planning")).toBeVisible();
    await expect(page.getByTestId("marketing-feature-budget")).toBeVisible();
    await expect(page.getByTestId("marketing-sfeerbeeld-showcase")).toBeVisible();
    await expect(page.getByTestId("marketing-feature-sfeerbeeld")).toBeVisible();
    await expect(page.getByTestId("marketing-feature-offertes")).toBeVisible();
    await expect(page.getByTestId("marketing-feature-kluscoach")).toBeVisible();
  });

  test("Gratis beginnen linkt naar registratie", async ({ page }) => {
    await page.goto("/");

    const cta = page.getByTestId("marketing-hero-cta-primary");
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/login/register");
  });

  test("/login toont het inlogscherm", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByLabel("Wachtwoord")).toBeVisible();
    await expect(page.getByRole("button", { name: "Inloggen" })).toBeVisible();
  });

  test("floating nav is direct zichtbaar met inloggen en gratis beginnen", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    const nav = page.getByTestId("marketing-nav");
    await expect(nav).toBeVisible();
    await expect(page.getByTestId("marketing-nav-brand")).toContainText("RenoTasker");
    await expect(page.getByTestId("marketing-nav-login")).toBeVisible();
    await expect(page.getByTestId("marketing-nav-cta")).toBeVisible();
    await expect(page.getByTestId("marketing-nav-login")).toHaveAttribute("href", "/login");
    await expect(page.getByTestId("marketing-nav-cta")).toHaveAttribute("href", "/login/register");
  });

  test("about-sectie toont het oprichtersverhaal zonder placeholder", async ({ page }) => {
    await page.goto("/");

    const about = page.getByTestId("marketing-about");
    await about.scrollIntoViewIfNeeded();
    await expect(about).toBeVisible();
    await expect(about.getByText("Rajco Mol", { exact: true })).toBeVisible();
    await expect(about.getByText("Bedenker van RenoTasker")).toBeVisible();

    // Er mag nergens op de pagina nog een TODO-placeholder staan.
    await expect(page.getByText("TODO", { exact: false })).toHaveCount(0);
  });

  test("sfeerbeeld-pill in hero scrollt naar showcase-sectie", async ({ page }) => {
    await page.goto("/");

    const pill = page.getByTestId("marketing-hero-sfeerbeeld-pill");
    await expect(pill).toBeVisible();
    await expect(pill).toContainText("Nieuw: zie je verbouwing");

    await pill.click();

    const showcase = page.getByTestId("marketing-sfeerbeeld-showcase");
    await expect(showcase).toBeInViewport({ timeout: 15_000 });
    await expect(showcase.getByRole("heading", { name: /Sfeerbeeld/ })).toBeVisible();
  });

  test("feature-screenshot lightbox opent en sluit", async ({ page }) => {
    await page.goto("/");

    const ruimtesScreenshot = page.getByTestId("marketing-feature-ruimtes-screenshot");
    await ruimtesScreenshot.scrollIntoViewIfNeeded();
    await ruimtesScreenshot.click();
    const lightbox = page.getByTestId("marketing-lightbox");
    await expect(lightbox).toBeVisible();

    await page.getByTestId("marketing-lightbox-close").click();
    await expect(lightbox).not.toBeVisible();

    const sfeerbeeldScreenshot = page.getByTestId("marketing-feature-sfeerbeeld-screenshot");
    await sfeerbeeldScreenshot.scrollIntoViewIfNeeded();
    await sfeerbeeldScreenshot.click();
    await expect(lightbox).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(lightbox).not.toBeVisible();

    const offertesScreenshot = page.getByTestId("marketing-feature-offertes-screenshot");
    await offertesScreenshot.scrollIntoViewIfNeeded();
    await offertesScreenshot.click();
    await expect(lightbox).toBeVisible();
    await page.getByTestId("marketing-lightbox-backdrop").click({ position: { x: 5, y: 5 } });
    await expect(lightbox).not.toBeVisible();
  });

  // TODO: ingelogde redirect van / naar /dashboard testen zodra er een lichte publieke test-auth setup is.
});
