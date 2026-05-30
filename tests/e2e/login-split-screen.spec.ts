import { test, expect } from "@playwright/test";

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 375, height: 812 };

test.describe("login split-screen layout", () => {
  test("loginpagina laadt met split-screen layout op desktop", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/login");

    // Linkerkant: fotopaneel met merknaam + tagline zichtbaar
    const hero = page.getByTestId("auth-hero");
    await expect(hero).toBeVisible();
    await expect(hero.getByText("RenoTasker")).toBeVisible();
    await expect(hero.getByRole("heading", { name: "Grip op je verbouwing" })).toBeVisible();

    // Rechterkant: formulier met heading
    await expect(page.getByRole("heading", { name: "Welkom terug" })).toBeVisible();
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByLabel("Wachtwoord")).toBeVisible();
    await expect(page.getByRole("button", { name: "Inloggen" })).toBeVisible();
  });

  test("formulier is zichtbaar en invulbaar", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/login");

    const email = page.getByLabel("E-mail");
    const password = page.getByLabel("Wachtwoord");

    await email.fill("test@voorbeeld.nl");
    await password.fill("geheim-wachtwoord");

    await expect(email).toHaveValue("test@voorbeeld.nl");
    await expect(password).toHaveValue("geheim-wachtwoord");
  });

  test("op mobiel viewport is de foto verborgen", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/login");

    // Fotopaneel is verborgen (hidden md:block), formulier blijft zichtbaar
    await expect(page.getByTestId("auth-hero")).toBeHidden();
    await expect(page.getByRole("heading", { name: "Welkom terug" })).toBeVisible();
    await expect(page.getByLabel("E-mail")).toBeVisible();
  });
});
