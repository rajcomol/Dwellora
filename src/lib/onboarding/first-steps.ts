import { uniqueTasksById } from "@/lib/renovation/sharedTask";
import type { ID, ProjectExpense, Room, Task } from "@/lib/renovation/types";

export const FIRST_STEPS_TOTAL = 4;

export type FirstStepId = "project" | "room" | "task" | "expense";

export type FirstStepsCounts = {
  hasProject: boolean;
  roomCount: number;
  taskCount: number;
  expenseCount: number;
};

export type FirstStep = {
  id: FirstStepId;
  done: boolean;
};

export function countActiveProjectFirstSteps(
  projectId: ID | null,
  rooms: Room[],
  tasks: Task[],
  expenses: ProjectExpense[],
  hasAnyProject: boolean
): FirstStepsCounts {
  if (!projectId) {
    return {
      hasProject: hasAnyProject,
      roomCount: 0,
      taskCount: 0,
      expenseCount: 0,
    };
  }

  const projectRooms = rooms.filter((room) => room.projectId === projectId);
  const roomIds = new Set(projectRooms.map((room) => room.id));
  const projectTasks = uniqueTasksById(
    tasks.filter(
      (task) => task.projectId === projectId || task.roomIds.some((roomId) => roomIds.has(roomId))
    )
  );
  const projectExpenses = expenses.filter((expense) => expense.projectId === projectId);

  return {
    hasProject: true,
    roomCount: projectRooms.length,
    taskCount: projectTasks.length,
    expenseCount: projectExpenses.length,
  };
}

export function buildFirstSteps(counts: FirstStepsCounts): FirstStep[] {
  return [
    { id: "project", done: counts.hasProject },
    { id: "room", done: counts.roomCount >= 1 },
    { id: "task", done: counts.taskCount >= 1 },
    { id: "expense", done: counts.expenseCount >= 1 },
  ];
}

export function completedFirstStepCount(steps: FirstStep[]): number {
  return steps.filter((step) => step.done).length;
}

export function firstStepsProgressPercent(steps: FirstStep[]): number {
  return (completedFirstStepCount(steps) / FIRST_STEPS_TOTAL) * 100;
}

/** Steps 2–4 complete: show the tour offer / dismiss end state. */
export function isFirstStepsSetupComplete(steps: FirstStep[]): boolean {
  const byId = new Map(steps.map((step) => [step.id, step.done]));
  return Boolean(byId.get("room") && byId.get("task") && byId.get("expense"));
}

export function shouldShowFirstStepsCard(input: {
  isProfileReady: boolean;
  isOnboardingCompleted: boolean;
  hasProject: boolean;
}): boolean {
  return input.isProfileReady && !input.isOnboardingCompleted && input.hasProject;
}

export function firstRoomIdForProject(projectId: ID, rooms: Room[]): ID | null {
  const projectRooms = rooms
    .filter((room) => room.projectId === projectId)
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
  return projectRooms[0]?.id ?? null;
}
