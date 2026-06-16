import { describe, expect, it } from "vitest";
import { buildDashboardTourSteps } from "@/lib/help/tour-steps";

function t(key: string): string {
  return key;
}

describe("buildDashboardTourSteps", () => {
  it("builds eight nav-focused steps without legacy route targets", () => {
    const steps = buildDashboardTourSteps({ t });
    expect(steps).toHaveLength(8);
    expect(steps[0]?.title).toBe("onboarding.stepTabsTitle");
    expect(steps[7]?.title).toBe("onboarding.stepHelpTitle");

    const serialized = JSON.stringify(steps);
    expect(serialized).not.toContain("dashboard-hero");
    expect(serialized).not.toContain("projects-list");
    expect(serialized).not.toContain("planning-hub");
    expect(serialized).not.toContain("quotes-hub");
    expect(serialized).not.toContain("brand-home");
  });
});
