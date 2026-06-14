import { test, expect } from "@playwright/test";
import { loginAsTestUser, testUserCredentialsConfigured } from "./helpers/auth";
import {
  createDeclaratie,
  expectBouwdepotDeclaratieRemaining,
  expectDeclaratieRemaining,
  openDeclaratiesTab,
  updateDeclaratieStatus,
} from "./helpers/bouwdepotDeclaraties";
import { createProjectAndSelect, openDashboard, uniqueName } from "./helpers/dashboard";
import { formatCurrency } from "../../src/lib/format/currency";

test.describe("bouwdepot declaraties", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!testUserCredentialsConfigured, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD");
    await loginAsTestUser(page);
  });

  test("creates open declaratie and updates remaining after uitbetaald", async ({ page }, testInfo) => {
    const projectName = uniqueName("PW Declaratie", testInfo);
    const declTitle = uniqueName("Sanitair", testInfo);
    const depotTotal = 20_000;
    const declAmount = 5_000;

    await createProjectAndSelect(page, {
      name: projectName,
      ownContribution: "10000",
      constructionDepotTotal: String(depotTotal),
    });
    const url = new URL(page.url());
    const projectId = url.searchParams.get("project");
    if (!projectId) throw new Error("Missing project id after create");

    await openDeclaratiesTab(page, projectId);
    await expectDeclaratieRemaining(page, depotTotal);

    await createDeclaratie(page, { omschrijving: declTitle, bedrag: String(declAmount), status: "open" });
    await expect(
      page.getByTestId("bouwdepot-row").filter({ hasText: declTitle })
    ).toHaveAttribute("data-bouwdepot-status", "open");
    await expectDeclaratieRemaining(page, depotTotal);

    await updateDeclaratieStatus(page, declTitle, "uitbetaald");
    await expectDeclaratieRemaining(page, depotTotal - declAmount);

    await openDashboard(page);
    await expectBouwdepotDeclaratieRemaining(page, depotTotal - declAmount);
    await expect(page.getByTestId("bouwdepot-declaratie-card")).toContainText(formatCurrency(declAmount));
    await expect(page.getByTestId("bouwdepot-declaratie-card")).toContainText(formatCurrency(depotTotal));
  });
});
