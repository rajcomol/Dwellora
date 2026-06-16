import { describe, expect, it } from "vitest";
import {
  buildFirstSteps,
  completedFirstStepCount,
  countActiveProjectFirstSteps,
  firstStepsProgressPercent,
  isFirstStepsSetupComplete,
  shouldShowFirstStepsCard,
} from "@/lib/onboarding/first-steps";
import type { ProjectExpense, Room, Task } from "@/lib/renovation/types";

const projectId = "project-1";
const roomId = "room-1";

const rooms: Room[] = [{ id: roomId, name: "Keuken", projectId }];
const tasks: Task[] = [
  {
    id: "task-1",
    title: "Schilderen",
    projectId,
    roomIds: [roomId],
    status: "todo",
    durationDays: 1,
    priority: "medium",
    renovationPhase: "Execution",
    description: "",
    assignedRosterId: null,
    sortOrder: 0,
    startDate: null,
    fundedByConstructionDepot: false,
  },
];
const expenses: ProjectExpense[] = [
  {
    id: "expense-1",
    projectId,
    title: "Verf",
    amount: 50,
    spentOn: null,
    notes: "",
    createdAt: "2026-01-01T00:00:00.000Z",
    taskId: null,
    kostType: "werkelijk",
    categorie: "overig",
    bouwdepotStatus: "open",
    fundedByConstructionDepot: false,
  },
];

describe("first-steps helpers", () => {
  it("counts rooms, tasks and expenses for the active project", () => {
    expect(countActiveProjectFirstSteps(null, rooms, tasks, expenses, true)).toEqual({
      hasProject: true,
      roomCount: 0,
      taskCount: 0,
      expenseCount: 0,
    });

    expect(countActiveProjectFirstSteps(projectId, rooms, tasks, expenses, true)).toEqual({
      hasProject: true,
      roomCount: 1,
      taskCount: 1,
      expenseCount: 1,
    });
  });

  it("builds step completion and progress from counts", () => {
    const empty = buildFirstSteps(countActiveProjectFirstSteps(projectId, [], [], [], true));
    expect(empty).toEqual([
      { id: "project", done: true },
      { id: "room", done: false },
      { id: "task", done: false },
      { id: "expense", done: false },
    ]);
    expect(completedFirstStepCount(empty)).toBe(1);
    expect(firstStepsProgressPercent(empty)).toBe(25);
    expect(isFirstStepsSetupComplete(empty)).toBe(false);

    const full = buildFirstSteps(countActiveProjectFirstSteps(projectId, rooms, tasks, expenses, true));
    expect(completedFirstStepCount(full)).toBe(4);
    expect(isFirstStepsSetupComplete(full)).toBe(true);
  });

  it("decides when the dashboard card should render", () => {
    expect(
      shouldShowFirstStepsCard({
        isProfileReady: true,
        isOnboardingCompleted: false,
        hasProject: true,
      })
    ).toBe(true);
    expect(
      shouldShowFirstStepsCard({
        isProfileReady: true,
        isOnboardingCompleted: true,
        hasProject: true,
      })
    ).toBe(false);
  });
});
