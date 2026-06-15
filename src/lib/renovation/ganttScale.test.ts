import { describe, expect, it } from "vitest";
import { barPositionPercentForDates, buildGanttScaleFromWindow } from "@/lib/renovation/ganttScale";

describe("buildGanttScaleFromWindow", () => {
  it("spans from planning start through totalDays", () => {
    const scale = buildGanttScaleFromWindow("2026-06-15", 5);
    expect(scale.totalDays).toBe(5);
    expect(scale.months.length).toBeGreaterThan(0);
  });

  it("places first task bar at window start", () => {
    const scale = buildGanttScaleFromWindow("2026-06-15", 5);
    const pos = barPositionPercentForDates(scale, "2026-06-15", "2026-06-17");
    expect(pos.left).toBe(0);
    expect(pos.width).toBeCloseTo(60, 0);
  });
});
