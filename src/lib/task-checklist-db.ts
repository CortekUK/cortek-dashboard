import { supabase } from "@/lib/supabase"

export type TaskChecklistItem = {
  id: string
  taskId: string
  title: string
  done: boolean
  position: number
  createdAt: string
  updatedAt: string
}

type TaskChecklistRow = {
  id: string
  task_id: string
  title: string
  done: boolean
  position: number
  created_at: string
  updated_at: string
}

const COLUMNS = "id, task_id, title, done, position, created_at, updated_at"

function fromRow(r: TaskChecklistRow): TaskChecklistItem {
  return {
    id: r.id,
    taskId: r.task_id,
    title: r.title,
    done: r.done,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listTaskChecklistItems(
  taskId: string
): Promise<TaskChecklistItem[]> {
  const { data, error } = await supabase
    .from("task_checklist_items")
    .select(COLUMNS)
    .eq("task_id", taskId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data as TaskChecklistRow[]).map(fromRow)
}

export async function createTaskChecklistItem(input: {
  taskId: string
  title: string
  position?: number
}): Promise<TaskChecklistItem> {
  const { data, error } = await supabase
    .from("task_checklist_items")
    .insert({
      task_id: input.taskId,
      title: input.title.trim(),
      position: input.position ?? 0,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as TaskChecklistRow)
}

export async function updateTaskChecklistItem(
  id: string,
  patch: Partial<Pick<TaskChecklistItem, "title" | "done" | "position">>
): Promise<TaskChecklistItem> {
  const row: Record<string, unknown> = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.done !== undefined) row.done = patch.done
  if (patch.position !== undefined) row.position = patch.position
  const { data, error } = await supabase
    .from("task_checklist_items")
    .update(row)
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as TaskChecklistRow)
}

export async function deleteTaskChecklistItem(id: string): Promise<void> {
  const { error } = await supabase
    .from("task_checklist_items")
    .delete()
    .eq("id", id)
  if (error) throw error
}
