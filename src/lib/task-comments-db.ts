import { supabase } from "@/lib/supabase"

export type TaskComment = {
  id: string
  taskId: string
  parentId: string | null
  author: string
  body: string
  createdAt: string
  updatedAt: string
}

type TaskCommentRow = {
  id: string
  task_id: string
  parent_id: string | null
  author: string
  body: string
  created_at: string
  updated_at: string
}

const COLUMNS =
  "id, task_id, parent_id, author, body, created_at, updated_at"

function fromRow(r: TaskCommentRow): TaskComment {
  return {
    id: r.id,
    taskId: r.task_id,
    parentId: r.parent_id,
    author: r.author,
    body: r.body,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from("task_comments")
    .select(COLUMNS)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data as TaskCommentRow[]).map(fromRow)
}

export async function insertTaskComment(input: {
  taskId: string
  author: string
  body: string
  parentId?: string | null
}): Promise<TaskComment> {
  const { data, error } = await supabase
    .from("task_comments")
    .insert({
      task_id: input.taskId,
      parent_id: input.parentId ?? null,
      author: input.author.trim() || "Anonymous",
      body: input.body,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as TaskCommentRow)
}

export async function deleteTaskComment(id: string): Promise<void> {
  const { error } = await supabase.from("task_comments").delete().eq("id", id)
  if (error) throw error
}
