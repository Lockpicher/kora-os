export interface MoveTaskCommand {
  task_id: string;
  target_column_id: string;
  new_position?: number;
}
