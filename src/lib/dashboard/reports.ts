import { sumEstimatedCostsUnique, taskEstimatedAmount } from "@/lib/dashboard/taskCosts";
import type { Project, ProjectExpense, Room, Task } from "@/lib/renovation/types";

export type RoomSpend = {
  roomId: string;
  roomName: string;
  estimated: number;
  actual: number;
  taskCount: number;
};

export function aggregateSpendByRoom(tasks: Task[], rooms: Room[]): RoomSpend[] {
  const roomName = new Map(rooms.map((r) => [r.id, r.name]));
  const map = new Map<string, { estimated: number; actual: number; taskCount: number }>();
  for (const t of tasks) {
    for (const roomId of t.roomIds) {
      const cur = map.get(roomId) ?? { estimated: 0, actual: 0, taskCount: 0 };
      cur.estimated += taskEstimatedAmount(t);
      cur.actual += Number.isFinite(t.actualCost) ? t.actualCost : 0;
      cur.taskCount += 1;
      map.set(roomId, cur);
    }
  }
  return [...map.entries()]
    .map(([roomId, v]) => ({
      roomId,
      roomName: roomName.get(roomId) ?? roomId,
      ...v,
    }))
    .sort((a, b) => b.estimated + b.actual - (a.estimated + a.actual));
}

export function projectBudgetSummary(
  project: Project,
  tasksInProject: Task[],
  expensesInProject: ProjectExpense[] = []
) {
  const est = sumEstimatedCostsUnique(tasksInProject);
  const actTasks = tasksInProject.reduce((s, t) => s + (Number.isFinite(t.actualCost) ? t.actualCost : 0), 0);
  const actLoose = expensesInProject.reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0);
  const act = actTasks + actLoose;
  return {
    budget: project.totalBudget,
    totalEstimated: est,
    totalActual: act,
    totalActualFromTasks: actTasks,
    totalLooseExpenses: actLoose,
    budgetVsEstimated: project.totalBudget - est,
    estimatedVsActual: est - act,
  };
}
