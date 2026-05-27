import { expect, type Page } from "@playwright/test";
import { formatCurrency } from "../../../src/lib/format/currency";
import { gotoProjectPath } from "./dashboard";

export async function openProjectSettings(page: Page, projectId: string): Promise<void> {
  await gotoProjectPath(page, `/dashboard/projects/${projectId}/settings`, /\/settings/);
  await expect(page.getByTestId("bouwdepot-declaraties-section")).toBeVisible({ timeout: 60_000 });
}

export async function expectDeclaratieRemaining(page: Page, amount: number): Promise<void> {
  const stat = page.getByTestId("declaratie-stat-resterend");
  await expect(stat).toBeVisible({ timeout: 60_000 });
  await expect(stat).toContainText(formatCurrency(amount), { timeout: 60_000 });
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
  await page.getByTestId("declaratie-add-button").click();
  const modal = page.getByTestId("bouwdepot-declaratie-modal");
  await expect(modal).toBeVisible({ timeout: 30_000 });
  await modal.getByTestId("declaratie-omschrijving").fill(omschrijving);
  await modal.getByTestId("declaratie-bedrag").fill(bedrag);
  if (status !== "open") {
    await modal.getByTestId("declaratie-status").selectOption(status);
  }
  await modal.getByTestId("declaratie-save").click();
  await expect(modal).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId("declaratie-row").filter({ hasText: omschrijving })).toBeVisible({
    timeout: 60_000,
  });
}

export async function updateDeclaratieStatus(
  page: Page,
  omschrijving: string,
  status: string
): Promise<void> {
  const row = page.getByTestId("declaratie-row").filter({ hasText: omschrijving }).first();
  await row.getByRole("button", { name: "Bewerken" }).click();
  const modal = page.getByTestId("bouwdepot-declaratie-modal");
  await expect(modal).toBeVisible({ timeout: 30_000 });
  await modal.getByTestId("declaratie-status").selectOption(status);
  if (status === "uitbetaald") {
    await modal.getByTestId("declaratie-uitbetaald-op").fill("2026-01-15");
  }
  await modal.getByTestId("declaratie-save").click();
  await expect(modal).toBeHidden({ timeout: 60_000 });
  await expect(row).toHaveAttribute("data-declaratie-status", status, { timeout: 60_000 });
}
