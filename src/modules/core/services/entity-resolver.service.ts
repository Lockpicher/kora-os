import { createClient } from '@/lib/supabase/server'

export type ResolvedEntity = {
  id: string
  type: "project" | "task" | "product" | "brand"
  name: string
  confidence: number // 0 to 1
  metadata?: Record<string, unknown>
}

export class EntityResolverService {
  /**
   * Resolves a string query to the most likely entities in the system.
   * This is used by Quick Capture and AI routing.
   */
  async resolve(query: string, types?: Array<"project" | "task" | "product" | "brand">): Promise<ResolvedEntity[]> {
    if (!query || query.trim() === '') return []
    
    const supabase = await createClient()
    const results: ResolvedEntity[] = []
    
    const term = `%${query.trim()}%`

    // Search Projects
    if (!types || types.includes("project")) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, status')
        .ilike('name', term)
        .limit(3)
        
      if (projects) {
        projects.forEach(p => {
          results.push({
            id: p.id,
            type: "project",
            name: p.name,
            confidence: 0.9, // Simplified confidence score
            metadata: { status: p.status }
          })
        })
      }
    }

    // Search Tasks
    if (!types || types.includes("task")) {
      // Using search_vector or ilike for simplicity in this fallback
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, readable_id')
        .ilike('title', term)
        .limit(3)
        
      if (tasks) {
        tasks.forEach(t => {
          results.push({
            id: t.id,
            type: "task",
            name: t.title,
            confidence: 0.8,
            metadata: { readable_id: t.readable_id }
          })
        })
      }
    }

    // Sort by confidence descending
    return results.sort((a, b) => b.confidence - a.confidence)
  }
}
