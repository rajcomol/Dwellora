import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { dismissOnboardingTour, killTour, waitForDashboardAppReady } from "./auth";

type CreateProjectOptions = {
  name: string;
  ownContribution?: string;
  constructionDepotTotal?: string;
};

type CreateTaskOptions = {
  estimatedCost?: string;
  actualCost?: string;
  startDate?: string;
  durationDays?: string;
  extraRooms?: string[];
};

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function uniqueName(prefix: string, testInfo: TestInfo): string {
  return `${prefix} ${Date.now()} ${slug(testInfo.project.name)} ${testInfo.parallelIndex}`;
}

function withCurrentProject(page: Page, path: string): string {
  const currentUrl = page.url();
  if (!currentUrl) return path;

  try {
    const url = new URL(currentUrl);
    const projectId = url.searchParams.get("project");
    if (!projectId) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}project=${encodeURIComponent(projectId)}`;
  } catch {
    return path;
  }
}

async function waitForSelectedProject(page: Page): Promise<void> {
  const switcher = page.locator('[data-tour="project-switcher"]:visible').first();
  await expect(switcher).not.toContainText("Kies een project", { timeout: 30_000 });
}

async function settleAfterNavigation(page: Page): Promise<void> {
  await waitForDashboardAppReady(page);
  await dismissOnboardingTour(page);
}

async function clickNavLink(page: Page, name: string, urlPattern: string | RegExp): Promise<boolean> {
  const link = page.locator("nav:visible").getByRole("link", { name, exact: true }).first();
  if (!(await link.isVisible().catch(() => false))) return false;
  await page.evaluate(() => window.scrollTo(0, 0));
  try {
    await link.click({ timeout: 10_000 });
  } catch {
    await link.click({ force: true, timeout: 10_000 });
  }
  await page.waitForURL(urlPattern, { timeout: 60_000 });
  await settleAfterNavigation(page);
  await waitForSelectedProject(page);
  return true;
}

export async function gotoProjectPath(
  page: Page,
  path: string,
  urlPattern: string | RegExp = /\?project=/
): Promise<void> {
  const target = withCurrentProject(page, path);
  await page.goto(target, { waitUntil: "domcontentloaded" });
  await page.waitForURL(urlPattern, { timeout: 60_000 });
  await settleAfterNavigation(page);
  if (target.includes("project=")) {
    await waitForSelectedProject(page);
  }
}

export async function openDashboard(page: Page): Promise<void> {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
  await killTour(page);
  await expect(page.getByRole("heading", { name: "Jouw renovatie-overzicht" })).toBeVisible({
    timeout: 60_000,
  });
}

export async function openRoomsPage(page: Page): Promise<void> {
  // Try nav link first (desktop sidebar / mobile nav)
  if (await clickNavLink(page, "Ruimtes", "**/rooms**")) {
    await expect(page.getByRole("heading", { name: "Ruimtes" })).toBeVisible({ timeout: 60_000 });
    return;
  }
  // Fallback: direct URL navigation (handles mobile where nav link may not be visible)
  await gotoProjectPath(page, "/dashboard/rooms");
  await expect(page.getByRole("heading", { name: "Ruimtes" })).toBeVisible({ timeout: 60_000 });
}

export async function openPlanningPage(page: Page): Promise<void> {
  if (await clickNavLink(page, "Planning", "**/planning**")) return;
  await gotoProjectPath(page, "/dashboard/planning", "**/planning**");
}

export async function openReportsPage(page: Page): Promise<void> {
  if (await clickNavLink(page, "Financiën", "**/finances**")) {
    await page.getByTestId("finances-tab-rapporten").click();
    await page.waitForURL(/\/dashboard\/finances.*tab=rapporten/, { timeout: 60_000 });
    await settleAfterNavigation(page);
    return;
  }
  const moreButton = page.getByTestId("bottom-nav-more");
  if (await moreButton.isVisible().catch(() => false)) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await moreButton.click({ force: true });
    const financesLink = page.getByRole("dialog").getByRole("link", { name: "Financiën", exact: true });
    await financesLink.click({ force: true });
    await page.waitForURL("**/finances**", { timeout: 60_000 });
    await settleAfterNavigation(page);
    await page.getByTestId("finances-tab-rapporten").click();
    await page.waitForURL(/\/dashboard\/finances.*tab=rapporten/, { timeout: 60_000 });
    await settleAfterNavigation(page);
    return;
  }
  await gotoProjectPath(page, "/dashboard/finances?tab=rapporten", "**/finances**");
}

export async function openFinancesPage(page: Page): Promise<void> {
  if (await clickNavLink(page, "Financiën", "**/finances**")) return;
  await gotoProjectPath(page, "/dashboard/finances", "**/finances**");
}

export async function createProject(
  page: Page,
  { name, ownContribution = "25000", constructionDepotTotal = "0" }: CreateProjectOptions
): Promise<string> {
  await page.goto("/dashboard/projects", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/dashboard\/projects/, { timeout: 30_000 });
  const loadingProjects = page.getByText("Projecten laden…");
  if (await loadingProjects.isVisible().catch(() => false)) {
    await expect(loadingProjects).toBeHidden({ timeout: 60_000 });
  }
  await expect(async () => {
    await page.getByLabel("Projectnaam").fill(name);
  }).toPass({ timeout: 30_000 });
  await page.getByLabel("Eigen geld").fill(ownContribution);
  await page.getByLabel("Bouwdepot totaal").fill(constructionDepotTotal);
  await page.getByRole("button", { name: "Project aanmaken" }).click();
  const projectCard = page.getByTestId("project-card").filter({ hasText: name }).first();
  await expect(projectCard).toBeVisible({ timeout: 60_000 });
  const projectId = await projectCard.getAttribute("data-project-id");
  if (!projectId) {
    throw new Error(`Could not determine project id for ${name}`);
  }
  return projectId;
}

export async function createProjectAndSelect(
  page: Page,
  options: CreateProjectOptions
): Promise<void> {
  const projectId = await createProject(page, options);
  await page.waitForURL(new RegExp(`[?&]project=${projectId}`), { timeout: 60_000 });
  await settleAfterNavigation(page);
  await waitForSelectedProject(page);
  await expect(page.locator('[data-tour="project-switcher"]:visible').first()).toContainText(options.name, {
    timeout: 60_000,
  });
}

export function getRoomOverviewCard(page: Page, roomName: string): Locator {
  return page.getByTestId("rooms-overview-card").filter({ hasText: roomName }).first();
}

export async function addRoom(page: Page, roomName: string): Promise<void> {
  await openRoomsPage(page);
  await page.getByRole("button", { name: "Nieuwe ruimte" }).click();
  await page.getByLabel("Nieuwe ruimte").fill(roomName);
  await page.getByRole("button", { name: "Opslaan" }).click();
  await expect(getRoomOverviewCard(page, roomName)).toBeVisible({ timeout: 60_000 });
}

export async function openProjectOverview(page: Page): Promise<void> {
  await killTour(page);
  await openRoomsPage(page);
  await dismissOnboardingTour(page);
  await page.getByTestId("nav-tab-projectoverzicht").dispatchEvent("click");
  await page.waitForURL(/\/rooms.*tab=overzicht/, { timeout: 60_000 });
  await settleAfterNavigation(page);
  await expect(page.getByText("Projectgegevens", { exact: true })).toBeVisible({ timeout: 60_000 });
}

export function getProjectRoomCard(page: Page, roomName: string): Locator {
  return page.getByTestId("project-room-card").filter({ hasText: roomName }).first();
}

export async function addTaskToRoom(
  page: Page,
  roomName: string,
  taskTitle: string,
  {
    estimatedCost,
    actualCost,
    startDate,
    durationDays,
    extraRooms = [],
  }: CreateTaskOptions = {}
): Promise<void> {
  const roomCard = getProjectRoomCard(page, roomName);
  const titleInput = roomCard.getByLabel("Taaktitel");

  await expect(roomCard).toBeVisible({ timeout: 60_000 });
  await titleInput.fill(taskTitle);

  if (estimatedCost !== undefined) {
    await roomCard.getByLabel("Geschatte kosten").fill(estimatedCost);
  }

  if (actualCost !== undefined) {
    await roomCard.getByLabel("Werkelijke kosten").fill(actualCost);
  }

  if (durationDays !== undefined) {
    await roomCard.getByLabel("Duur (dagen)").fill(durationDays);
  }

  if (startDate !== undefined) {
    await roomCard.getByLabel("Startdatum").fill(startDate);
  }

  for (const extraRoom of extraRooms) {
    await roomCard.getByRole("checkbox", { name: extraRoom, exact: true }).check();
  }

  await roomCard.getByRole("button", { name: "Taak toevoegen" }).click();
  await expect(roomCard.getByText(taskTitle, { exact: true })).toBeVisible({ timeout: 60_000 });
}

export async function addLooseExpense(page: Page, title: string, amount: number): Promise<void> {
  await openDashboard(page);
  await expect(page.getByTestId("loose-expenses-section")).toBeVisible({ timeout: 30_000 });

  // Dismiss tour and wait for overlay path to disappear before clicking.
  await killTour(page);
  await page.locator("#react-joyride-portal path[fill='rgba(0, 0, 0, 0.5)']").waitFor({
    state: "hidden",
    timeout: 30_000,
  }).catch(() => {});
  await page.getByRole("button", { name: "+ Uitgave toevoegen" }).click({ force: true, timeout: 30_000 });

  const dialog = page.getByRole("dialog", { name: "Uitgave toevoegen" });
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await dialog.getByLabel("Omschrijving").fill(title);
  await dialog.getByLabel("Bedrag").fill(String(amount));
  await dialog.getByRole("button", { name: "Opslaan" }).click({ force: true });
  await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 60_000 });
}
