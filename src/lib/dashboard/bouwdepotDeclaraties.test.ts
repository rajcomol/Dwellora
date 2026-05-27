import { describe, expect, it } from "vitest";
import { computeDeclaratieTotals } from "./bouwdepotDeclaraties";
import type { BouwdepotDeclaratie } from "@/lib/renovation/types";

function decl(partial: Partial<BouwdepotDeclaratie> & Pick<BouwdepotDeclaratie, "status" | "bedrag">): BouwdepotDeclaratie {
  return {
    id: "d1",
    projectId: "p1",
    userId: "u1",
    omschrijving: "Test",
    ingediendOp: null,
    uitbetaaldOp: null,
    taakId: null,
    notities: "",
    aangemaaktOp: "",
    bijgewerktOp: "",
    ...partial,
  };
}

describe("computeDeclaratieTotals", () => {
  it("sums by status for the given project", () => {
    const declaraties = [
      decl({ id: "1", status: "open", bedrag: 100 }),
      decl({ id: "2", status: "ingediend", bedrag: 200 }),
      decl({ id: "3", status: "uitbetaling_verwacht", bedrag: 300 }),
      decl({ id: "4", status: "uitbetaald", bedrag: 400 }),
      decl({ id: "5", status: "uitbetaald", bedrag: 50, projectId: "p2" }),
    ];
    const totals = computeDeclaratieTotals(declaraties, "p1");
    expect(totals.totaalOpen).toBe(100);
    expect(totals.totaalIngediend).toBe(500);
    expect(totals.totaalUitbetaald).toBe(400);
  });
});
