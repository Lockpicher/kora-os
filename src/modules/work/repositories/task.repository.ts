import { createClient } from '@/lib/supabase/server'
import { TaskInsert, TaskUpdate } from '../schema/task.schema'

export class TaskRepository {
  async findById(id: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single()
    if (error) throw new Error(error.message)
    return data
  }

  async create(taskData: TaskInsert) {
    const supabase = await createClient()
    const { data: result, error } = await supabase.from('tasks').insert(taskData).select().single()
    if (error) throw new Error(error.message)
    return result
  }

  async update(id: string, updateData: TaskUpdate) {
    const supabase = await createClient()
    const { data: result, error } = await supabase.from('tasks').update(updateData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return result
  }
}
