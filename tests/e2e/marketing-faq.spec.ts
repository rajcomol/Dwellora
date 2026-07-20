import { test, expect } from "@playwright/test";

test.describe("marketing FAQ", () => {
  test("toont de FAQ-sectie met de vragen", async ({ page }) => {
    await page.goto("/");

    const faq = page.getByTestId("marketing-faq");
    await faq.scrollIntoViewIfNeeded();
    await expect(faq).toBeVisible();
    await expect(page.getByRole("heading", { name: "Veelgestelde vragen" })).toBeVisible();
    await expect(page.getByTestId("marketing-faq-question-cost")).toBeVisible();
  });

  test("klik op een vraag toont het antwoord en wisselt aria-expanded", async ({ page }) => {
    await page.goto("/");

    const question = page.getByTestId("marketing-faq-question-cost");
    const answer = page.getByTestId("marketing-faq-answer-cost");

    await question.scrollIntoViewIfNeeded();

    // Dicht: antwoord is niet zichtbaar en aria-expanded staat op false.
    await expect(question).toHaveAttribute("aria-expanded", "false");
    await expect(answer).not.toBeVisible();

    // Open: antwoord verschijnt en aria-expanded wordt true.
    await question.click();
    await expect(question).toHaveAttribute("aria-expanded", "true");
    await expect(answer).toBeVisible();
    await expect(answer).toContainText("gratis");

    // Opnieuw klikken sluit het weer.
    await question.click();
    await expect(question).toHaveAttribute("aria-expanded", "false");
    await expect(answer).not.toBeVisible();
  });

  test("slechts één antwoord tegelijk open", async ({ page }) => {
    await page.goto("/");

    const first = page.getByTestId("marketing-faq-question-cost");
    const second = page.getByTestId("marketing-faq-question-mobile");

    await first.scrollIntoViewIfNeeded();
    await first.click();
    await expect(first).toHaveAttribute("aria-expanded", "true");

    await second.click();
    await expect(second).toHaveAttribute("aria-expanded", "true");
    await expect(first).toHaveAttribute("aria-expanded", "false");
  });
});
