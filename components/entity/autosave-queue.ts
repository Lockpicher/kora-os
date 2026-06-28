import { updateTaskAction } from "@/app/actions/work.actions"

export type SaveTask = {
  id: string
  entityType: string
  entityId: string
  payload: Record<string, unknown>
  status: "pending" | "saving" | "success" | "error"
}

export class AutoSaveQueueManager {
  private queue: SaveTask[] = []
  private isProcessing = false
  
  add(task: Omit<SaveTask, "status">) {
    this.queue.push({ ...task, status: "pending" })
    this.processQueue()
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return
    this.isProcessing = true
    
    while (this.queue.length > 0) {
      const task = this.queue[0]
      try {
        task.status = "saving"
        
        if (task.entityType === 'task') {
           const res = await updateTaskAction(task.entityId, task.payload)
           if (!res.success) throw new Error(res.error)
        }
        // Futuro: soportar otros entityTypes
        
        task.status = "success"
        this.queue.shift() // Quitamos la tarea exitosa de la cola
      } catch {
        task.status = "error"
        // Rompemos el ciclo si hay error para evitar corrupción de estado
        // La UI debería ofrecer reintentar
        break 
      }
    }
    
    this.isProcessing = false
  }
}

export const autoSaveQueue = new AutoSaveQueueManager()
