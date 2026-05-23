import { describe, expect, it } from "vitest";
import { getBudgetSourceStatus } from "@/lib/dashboard/budgetSourceStatus";

describe("getBudgetSourceStatus", () => {
  it("returns critical when less than 10% remains", () => {
    expect(getBudgetSourceStatus(500, 10000)).toBe("critical");
  });

  it("returns warning when between 10% and 30% remains", () => {
    expect(getBudgetSourceStatus(2000, 10000)).toBe("warning");
  });

  it("returns healthy when at least 30% remains", () => {
    expect(getBudgetSourceStatus(4000, 10000)).toBe("healthy");
  });
});
