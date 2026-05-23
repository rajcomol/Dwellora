import { looseExpensesForBudget } from "@/lib/dashboard/projectBudget";
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
  const map = new Map<string, { estimated: number; actual: number; taskCount: number }>();
  for (const r of rooms) {
    map.set(r.id, { estimated: 0, actual: 0, taskCount: 0 });
  }
  for (const t of tasks) {
    for (const roomId of t.roomIds) {
      if (!map.has(roomId)) continue;
      const cur = map.get(roomId)!;
      cur.estimated += taskEstimatedAmount(t);
      cur.actual += Number.isFinite(t.actualCost) ? t.actualCost : 0;
      cur.taskCount += 1;
    }
  }
  return rooms
    .map((r) => {
      const v = map.get(r.id) ?? { estimated: 0, actual: 0, taskCount: 0 };
      return {
        roomId: r.id,
        roomName: r.name,
        estimated: v.estimated,
        actual: v.actual,
        taskCount: v.taskCount,
      };
    })
    .sort((a, b) => a.roomName.localeCompare(b.roomName, "nl"));
}

export function projectBudgetSummary(
  project: Project,
  tasksInProject: Task[],
  expensesInProject: ProjectExpense[] = []
) {
  const est = sumEstimatedCostsUnique(tasksInProject);
  const actTasks = tasksInProject.reduce((s, t) => s + (Number.isFinite(t.actualCost) ? t.actualCost : 0), 0);
  const actLoose = looseExpensesForBudget(expensesInProject, tasksInProject).reduce(
    (s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0),
    0
  );
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
