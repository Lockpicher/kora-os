export interface CreateTaskCommand {
  organization_id: string;
  project_id?: string;
  title: string;
  description?: string;
  priority_id?: string;
  workflow_column_id: string;
}
