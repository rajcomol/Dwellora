import { describe, expect, it } from "vitest";
import { mergeKostenItems } from "@/lib/mergeKostenItems";
import type { ProjectExpense } from "@/lib/renovation/types";

function sampleExpense(overrides: Partial<ProjectExpense> = {}): ProjectExpense {
  return {
    id: "e1",
    projectId: "p1",
    title: "Bouwmarkt",
    amount: 120,
    spentOn: "2026-01-10",
    notes: "",
    taskId: null,
    fundedByConstructionDepot: false,
    kostType: "werkelijk",
    categorie: "overig",
    bouwdepotStatus: "open",
    createdAt: "2026-01-10T10:00:00Z",
    ...overrides,
  };
}

describe("mergeKostenItems", () => {
  it("builds regels from all project expenses", () => {
    const regels = mergeKostenItems([
      sampleExpense({ id: "e1", amount: 500, categorie: "vloeren" }),
      sampleExpense({ id: "e2", amount: 75, kostType: "geschat" }),
    ]);

    expect(regels).toHaveLength(2);
    expect(regels.every((r) => r.id.startsWith("kostenpost-"))).toBe(true);
  });

  it("uses stored categorie label", () => {
    const [regel] = mergeKostenItems([sampleExpense({ categorie: "vloeren" })]);
    expect(regel.categorie).toBe("Vloeren");
    expect(regel.categorieId).toBe("vloeren");
  });

  it("includes kostType and bouwdepot fields", () => {
    const [regel] = mergeKostenItems([
      sampleExpense({
        kostType: "geschat",
        fundedByConstructionDepot: true,
        bouwdepotStatus: "ingediend",
      }),
    ]);
    expect(regel.kostType).toBe("geschat");
    expect(regel.gekoppeld_aan_depot).toBe(true);
    expect(regel.bouwdepotStatus).toBe("ingediend");
  });

  it("sorts werkelijk before geschat", () => {
    const regels = mergeKostenItems([
      sampleExpense({ id: "e-geschat", kostType: "geschat", amount: 900 }),
      sampleExpense({ id: "e-werkelijk", kostType: "werkelijk", amount: 50 }),
    ]);
    expect(regels.map((r) => r.id)).toEqual(["kostenpost-e-werkelijk", "kostenpost-e-geschat"]);
  });
});
