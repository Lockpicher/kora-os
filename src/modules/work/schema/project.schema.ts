import { z } from "zod";

export const ProjectInsertSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['active', 'archived', 'completed']).default('active'),
  emoji: z.string().optional(),
  color: z.string().optional(),
});

export type ProjectInsert = z.infer<typeof ProjectInsertSchema>;
