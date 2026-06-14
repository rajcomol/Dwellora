import { expect, type Page } from "@playwright/test";
import { formatCurrency } from "../../../src/lib/format/currency";
import { gotoProjectPath } from "./dashboard";

export async function openDeclaratiesTab(page: Page, projectId: string): Promise<void> {
  await gotoProjectPath(page, `/dashboard/finances?project=${projectId}`, /\/finances/);
  await expect(page.getByTestId("finances-page")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("finances-bouwdepot-section")).toBeVisible();
}

export async function expectDeclaratieRemaining(_page: Page, _amount: number): Promise<void> {
  // Depot-specific stat cards moved to unified finances page; remaining is covered via dashboard card tests.
}

export async function expectBouwdepotDeclaratieRemaining(page: Page, amount: number): Promise<void> {
  const card = page.getByTestId("bouwdepot-declaratie-card");
  await expect(card).toBeVisible({ timeout: 60_000 });
  await expect(card.getByTestId("bouwdepot-declaratie-remaining")).toHaveText(formatCurrency(amount), {
    timeout: 60_000,
  });
}

export async function createDeclaratie(
  page: Page,
  { omschrijving, bedrag, status = "open" }: { omschrijving: string; bedrag: string; status?: string }
): Promise<void> {
  await page.getByTestId("bouwdepot-add-declaratie").click();
  const modal = page.getByTestId("finances-bewerk-modal");
  await expect(modal).toBeVisible({ timeout: 30_000 });
  await modal.getByTestId("kosten-field-naam").fill(omschrijving);
  await modal.getByTestId("kosten-field-bedrag").fill(bedrag);
  if (status !== "open") {
    await modal.getByTestId("kosten-field-status").selectOption(status);
  }
  await modal.getByTestId("kosten-save").click();
  await expect(modal).toBeHidden({ timeout: 60_000 });
  await expect(
    page.getByTestId("bouwdepot-declaratie-row").filter({ hasText: omschrijving })
  ).toBeVisible({
    timeout: 60_000,
  });
}

export async function updateDeclaratieStatus(
  page: Page,
  omschrijving: string,
  status: string
): Promise<void> {
  const row = page.getByTestId("bouwdepot-declaratie-row").filter({ hasText: omschrijving }).first();
  await row.getByTestId("bouwdepot-declaratie-edit").click({ force: true });
  const modal = page.getByTestId("finances-bewerk-modal");
  await expect(modal).toBeVisible({ timeout: 30_000 });
  await modal.getByTestId("kosten-field-status").selectOption(status);
  if (status === "uitbetaald") {
    await modal.getByTestId("kosten-field-datum").fill("2026-01-15");
  }
  await modal.getByTestId("kosten-save").click();
  await expect(modal).toBeHidden({ timeout: 60_000 });
  await expect(row).toHaveAttribute("data-declaratie-status", status, { timeout: 60_000 });
}
