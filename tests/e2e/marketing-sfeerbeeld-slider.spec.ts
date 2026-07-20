import { test, expect } from "@playwright/test";

test.describe("marketing Sfeerbeeld voor/na-slider", () => {
  test("slider en handle zijn zichtbaar", async ({ page }) => {
    await page.goto("/");

    const showcase = page.getByTestId("marketing-sfeerbeeld-showcase");
    await showcase.scrollIntoViewIfNeeded();
    await expect(showcase).toBeVisible();

    await expect(page.getByTestId("marketing-feature-sfeerbeeld")).toBeVisible();

    const handle = page.getByTestId("marketing-sfeerbeeld-slider");
    await expect(handle).toBeVisible();
    await expect(handle).toHaveAttribute("role", "slider");
    await expect(handle).toHaveAttribute("aria-valuenow", "50");
  });

  test("toetsenbord verplaatst de scheidingslijn (aria-valuenow wijzigt)", async ({ page }) => {
    await page.goto("/");

    const handle = page.getByTestId("marketing-sfeerbeeld-slider");
    await handle.scrollIntoViewIfNeeded();
    await handle.focus();

    await expect(handle).toHaveAttribute("aria-valuenow", "50");

    await handle.press("ArrowRight");
    await handle.press("ArrowRight");
    await expect(handle).toHaveAttribute("aria-valuenow", "54");

    await handle.press("ArrowLeft");
    await expect(handle).toHaveAttribute("aria-valuenow", "52");

    await handle.press("Home");
    await expect(handle).toHaveAttribute("aria-valuenow", "0");

    await handle.press("End");
    await expect(handle).toHaveAttribute("aria-valuenow", "100");
  });

  test("slepen met de muis verandert de sliderpositie", async ({ page }) => {
    await page.goto("/");

    const compare = page.getByTestId("marketing-feature-sfeerbeeld");
    await compare.scrollIntoViewIfNeeded();
    const box = await compare.boundingBox();
    if (!box) throw new Error("Sfeerbeeld-vergelijker heeft geen bounding box");

    const handle = page.getByTestId("marketing-sfeerbeeld-slider");
    await expect(handle).toHaveAttribute("aria-valuenow", "50");

    // Sleep van het midden naar ~20% van de breedte.
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5, { steps: 8 });
    await page.mouse.up();

    await expect
      .poll(async () => Number(await handle.getAttribute("aria-valuenow")))
      .toBeLessThan(35);
  });

  test("klik om te vergroten opent en sluit de lightbox", async ({ page }) => {
    await page.goto("/");

    const enlarge = page.getByTestId("marketing-feature-sfeerbeeld-screenshot");
    await enlarge.scrollIntoViewIfNeeded();
    await enlarge.click();

    const lightbox = page.getByTestId("marketing-lightbox");
    await expect(lightbox).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(lightbox).not.toBeVisible();
  });
});
