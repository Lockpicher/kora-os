import { z } from "zod";

export const TaskInsertSchema = z.object({
  organization_id: z.string().uuid(),
  project_id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority_id: z.string().uuid().optional(),
  workflow_column_id: z.string().uuid(),
  start_date: z.string().datetime().optional(),
  due_date: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  estimated_minutes: z.number().int().optional(),
  actual_minutes: z.number().int().optional(),
});

export const TaskUpdateSchema = TaskInsertSchema.partial();

export type TaskInsert = z.infer<typeof TaskInsertSchema>;
export type TaskUpdate = z.infer<typeof TaskUpdateSchema>;
