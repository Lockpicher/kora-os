"use server"

import { workService } from '@/src/modules/work/services/work.service'
import { CreateTaskCommand } from '@/src/modules/work/commands/CreateTaskCommand'
import { MoveTaskCommand } from '@/src/modules/work/commands/MoveTaskCommand'

export async function createTaskAction(cmd: CreateTaskCommand) {
  try {
    const task = await workService.createTask(cmd)
    return { success: true, data: task }
  } catch (error: unknown) {
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
