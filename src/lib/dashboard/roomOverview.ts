export type RoomTaskSummaryRow = {
  room_id: string;
  project_id: string;
  room_name: string;
  task_count: number;
  completed_count: number;
  estimated_cost_sum: number;
  earliest_start_date: string | null;
  latest_end_date: string | null;
};
