import { TaskRepository } from '../repositories/task.repository'
import { CreateTaskCommand } from '../commands/CreateTaskCommand'
import { MoveTaskCommand } from '../commands/MoveTaskCommand'
import { createClient } from '@/lib/supabase/server'

export class WorkService {
  private taskRepo = new TaskRepository()

  async createTask(cmd: CreateTaskCommand) {
    const task = await this.taskRepo.create(cmd)
    
    // Emit Event
    const supabase = await createClient()
    await supabase.from('events').insert({
      organization_id: cmd.organization_id,
      event_name: 'TaskCreated',
      aggregate_type: 'task',
      aggregate_id: task.id,
      payload: task
    })

    return task
  }

  async updateTask(id: string, updateData: Record<string, unknown>) {
    const task = await this.taskRepo.update(id, updateData)
    
    // Emit Event
    const supabase = await createClient()
    await supabase.from('events').insert({
      organization_id: task.organization_id,
      event_name: 'TaskUpdated',
      aggregate_type: 'task',
      aggregate_id: task.id,
      payload: updateData
    })

    return task
  }

  async moveTask(cmd: MoveTaskCommand) {
    const task = await this.taskRepo.update(cmd.task_id, {
      workflow_column_id: cmd.target_column_id
    })

    // Emit Event
    const supabase = await createClient()
    await supabase.from('events').insert({
      organization_id: task.organization_id,
      event_name: 'TaskMoved',
      aggregate_type: 'task',
      aggregate_id: task.id,
      payload: { to_column: cmd.target_column_id }
    })

    return task
  }
}

export const workService = new WorkService()
