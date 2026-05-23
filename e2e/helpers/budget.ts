import { expect, type Page } from "@playwright/test";
import { formatCurrency } from "../../src/lib/format/currency";

export async function expectBudgetTotalSpent(page: Page, amount: number): Promise<void> {
  const card = page.getByTestId("budget-total-spent");
  await expect(card).toBeVisible({ timeout: 60_000 });
  await expect(card.getByTestId("budget-total-spent-amount")).toHaveText(formatCurrency(amount), {
    timeout: 60_000,
  });
}
