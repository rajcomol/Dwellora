import { describe, expect, it } from "vitest";
import { generateInsights } from "@/lib/dashboard/insights";
import { DEFAULT_RENOVATION_PHASE } from "@/lib/renovation/phases";
import type { Project, ProjectExpense, Task } from "@/lib/renovation/types";

const sampleProject: Project = {
  id: "p1",
  name: "Test",
  totalBudget: 1000,
  ownContribution: 1000,
  constructionDepotTotal: null,
  address: "",
  expectedKeyHandover: null,
  planningStartDate: null,
  notes: "",
};

const sampleTask = (overrides: Partial<Task> = {}): Task => ({
  id: "t1",
  projectId: "p1",
  title: "A",
  roomIds: ["r1"],
  fundedByConstructionDepot: false,
  status: "todo",
  durationDays: 1,
  priority: "medium",
  description: "",
  sortOrder: 0,
  startDate: null,
  assignedRosterId: null,
  renovationPhase: DEFAULT_RENOVATION_PHASE,
  ...overrides,
});

describe("generateInsights", () => {
  it("warns when kostenposten exceed total budget", () => {
    const insights = generateInsights(
      [sampleProject],
      [sampleTask()],
      [
        {
          id: "e1",
          projectId: "p1",
          title: "Bouwmarkt",
          amount: 1500,
          spentOn: "2025-03-01",
          notes: "",
          createdAt: "2025-03-01T12:00:00Z",
          taskId: null,
          fundedByConstructionDepot: false,
          kostType: "werkelijk",
          categorie: "overig",
          bouwdepotStatus: "open",
        },
      ]
    );
    expect(insights.some((i) => i.messageKey === "insights.spentExceedsBudget")).toBe(true);
  });

  it("does not warn on task cost fields when spend is within budget", () => {
    const insights = generateInsights(
      [sampleProject],
      [sampleTask()],
      [
        {
          id: "e1",
          projectId: "p1",
          title: "Klein",
          amount: 100,
          spentOn: null,
          notes: "",
          createdAt: "2025-03-01T12:00:00Z",
          taskId: null,
          fundedByConstructionDepot: false,
          kostType: "werkelijk",
          categorie: "overig",
          bouwdepotStatus: "open",
        },
      ]
    );
    expect(insights.some((i) => i.messageKey === "insights.spentExceedsBudget")).toBe(false);
  });
});
