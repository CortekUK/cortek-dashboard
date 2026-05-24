import { supabase } from "@/lib/supabase"

const BUCKET = "task-materials"

export type CommentAttachment = {
  id: string
  commentId: string
  url: string
  label: string | null
  position: number
  createdAt: string
}

type Row = {
  id: string
  comment_id: string
  url: string
  label: string | null
  position: number
  created_at: string
}

const COLUMNS = "id, comment_id, url, label, position, created_at"

function fromRow(r: Row): CommentAttachment {
  return {
    id: r.id,
    commentId: r.comment_id,
    url: r.url,
    label: r.label,
    position: r.position,
    createdAt: r.created_at,
  }
}

export async function listCommentAttachments(
  commentIds: string[]
): Promise<CommentAttachment[]> {
  if (commentIds.length === 0) return []
  const { data, error } = await supabase
    .from("task_comment_attachments")
    .select(COLUMNS)
    .in("comment_id", commentIds)
    .order("position", { ascending: true })
  if (error) throw error
  return (data as Row[]).map(fromRow)
}

export async function createCommentAttachments(
  inputs: Array<{
    commentId: string
    url: string
    label?: string | null
    position?: number
  }>
): Promise<CommentAttachment[]> {
  if (inputs.length === 0) return []
  const { data, error } = await supabase
    .from("task_comment_attachments")
    .insert(
      inputs.map((i, idx) => ({
        comment_id: i.commentId,
        url: i.url,
        label: i.label ?? null,
        position: i.position ?? idx,
      }))
    )
    .select(COLUMNS)
  if (error) throw error
  return (data as Row[]).map(fromRow)
}

export async function deleteCommentAttachment(id: string): Promise<void> {
  const { error } = await supabase
    .from("task_comment_attachments")
    .delete()
    .eq("id", id)
  if (error) throw error
}

function sanitize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

/** Upload a file for a thread comment. Path: `tasks/{taskId}/comments/{ts}-name`. */
export async function uploadCommentFile(
  taskId: string,
  file: File
): Promise<{ url: string; label: string }> {
  const path = `tasks/${taskId}/comments/${Date.now()}-${sanitize(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, label: file.name }
}
