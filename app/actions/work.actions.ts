"use server"

import { workService } from '@/src/modules/work/services/work.service'
import { CreateTaskCommand } from '@/src/modules/work/commands/CreateTaskCommand'
import { MoveTaskCommand } from '@/src/modules/work/commands/MoveTaskCommand'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { TaskInsertSchema } from '@/src/modules/work/schema/task.schema'

export async function createTaskAction(cmd: Record<string, unknown>) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // MOCK USER: Since SSR cookies aren't fully configured in lib/supabase/server.ts yet
    const activeUser = user || { id: '00000000-0000-0000-0000-000000000001' }

    let orgMember = await supabase.from("organization_members").select("organization_id").eq("user_id", activeUser.id).single().then(res => res.data)
    
    // Auto-link to default org if user has none (for local dev/testing)
    if (!orgMember?.organization_id) {
      const defaultOrgId = '00000000-0000-0000-0000-000000000000'
      await supabase.from("organization_members").insert({
        organization_id: defaultOrgId,
        user_id: activeUser.id,
        role: 'owner'
      })
      orgMember = { organization_id: defaultOrgId }
    }

    const validatedData = TaskInsertSchema.parse({
      ...cmd,
      organization_id: orgMember.organization_id
    })
    
    // Convert to CreateTaskCommand structure
    const taskCommand: CreateTaskCommand = {
      ...validatedData,
      organization_id: validatedData.organization_id,
      workflow_column_id: validatedData.workflow_column_id
    }

    const task = await workService.createTask(taskCommand)
    return { success: true, data: task }
  } catch (error: unknown) {
    console.error("CREATE TASK ERROR:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "An unknown error occurred" }
  }
}

export async function moveTaskAction(cmd: MoveTaskCommand) {
  try {
    const task = await workService.moveTask(cmd)
    return { success: true, data: task }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "An unknown error occurred" }
  }
}

export async function updateTaskAction(id: string, updateData: Record<string, unknown>) {
  try {
    const task = await workService.updateTask(id, updateData)
    return { success: true, data: task }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "An unknown error occurred" }
  }
}
