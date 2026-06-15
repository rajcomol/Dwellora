import { describe, expect, it } from "vitest";
import { mergeBouwdepotItems } from "@/lib/mergeBouwdepotItems";
import type { ProjectExpense } from "@/lib/renovation/types";

function sampleExpense(overrides: Partial<ProjectExpense> = {}): ProjectExpense {
  return {
    id: "e1",
    projectId: "p1",
    title: "Dakkapel",
    amount: 1500,
    spentOn: "2026-01-10",
    notes: "",
    taskId: null,
    fundedByConstructionDepot: true,
    kostType: "werkelijk",
    categorie: "dakwerk",
    bouwdepotStatus: "open",
    createdAt: "2026-01-10T10:00:00Z",
    ...overrides,
  };
}

describe("mergeBouwdepotItems", () => {
  it("includes only depot-linked expenses for the project", () => {
    const rows = mergeBouwdepotItems("p1", [
      sampleExpense({ id: "e1" }),
      sampleExpense({ id: "e2", projectId: "p2" }),
      sampleExpense({ id: "e3", fundedByConstructionDepot: false }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].source_id).toBe("e1");
  });

  it("sorts ingediend before open before uitbetaald", () => {
    const rows = mergeBouwdepotItems("p1", [
      sampleExpense({ id: "e-open", bouwdepotStatus: "open", amount: 100 }),
      sampleExpense({ id: "e-ing", bouwdepotStatus: "ingediend", amount: 50 }),
      sampleExpense({ id: "e-paid", bouwdepotStatus: "uitbetaald", amount: 200 }),
    ]);
    expect(rows.map((r) => r.source_id)).toEqual(["e-ing", "e-open", "e-paid"]);
  });

  it("carries bouwdepotStatus on each row", () => {
    const rows = mergeBouwdepotItems("p1", [sampleExpense({ bouwdepotStatus: "ingediend" })]);
    expect(rows[0].bouwdepotStatus).toBe("ingediend");
  });
});
