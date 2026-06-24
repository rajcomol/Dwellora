import { test, expect } from "@playwright/test";

test.describe("marketing smooth scroll (Lenis)", () => {
  test("Lenis is actief op de marketingpagina en scrollen werkt", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    // Lenis voegt de class 'lenis' toe aan <html> zodra het smooth scroll overneemt.
    await expect(page.locator("html")).toHaveClass(/lenis/);

    await expect(page.getByTestId("marketing-hero")).toBeVisible();

    await page.getByTestId("marketing-feature-kluscoach").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("marketing-feature-kluscoach")).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test("prefers-reduced-motion valt terug op native scroll (geen Lenis)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    await expect(page.getByTestId("marketing-hero")).toBeVisible();

    // Lenis mag niet initialiseren, dus <html> krijgt nooit de 'lenis' class.
    await expect(page.locator("html")).not.toHaveClass(/lenis/);

    // Native scrollen blijft gewoon werken en alle secties zijn bereikbaar.
    await page.getByTestId("marketing-feature-kluscoach").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("marketing-feature-kluscoach")).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });
});
