import { supabase } from "@/lib/supabase"

export type TaskAttachmentKind =
  | "briefing_loom"
  | "briefing_doc"
  | "completion_loom"
  | "completion_doc"

export type TaskAttachment = {
  id: string
  taskId: string
  kind: TaskAttachmentKind
  url: string
  label: string | null
  position: number
  createdAt: string
}

type TaskAttachmentRow = {
  id: string
  task_id: string
  kind: TaskAttachmentKind
  url: string
  label: string | null
  position: number
  created_at: string
}

const COLUMNS =
  "id, task_id, kind, url, label, position, created_at"

function fromRow(r: TaskAttachmentRow): TaskAttachment {
  return {
    id: r.id,
    taskId: r.task_id,
    kind: r.kind,
    url: r.url,
    label: r.label,
    position: r.position,
    createdAt: r.created_at,
  }
}

export async function listTaskAttachments(
  taskId: string
): Promise<TaskAttachment[]> {
  const { data, error } = await supabase
    .from("task_attachments")
    .select(COLUMNS)
    .eq("task_id", taskId)
    .order("kind", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data as TaskAttachmentRow[]).map(fromRow)
}

export async function createTaskAttachment(input: {
  taskId: string
  kind: TaskAttachmentKind
  url: string
  label?: string | null
  position?: number
}): Promise<TaskAttachment> {
  const { data, error } = await supabase
    .from("task_attachments")
    .insert({
      task_id: input.taskId,
      kind: input.kind,
      url: input.url.trim(),
      label: input.label?.trim() || null,
      position: input.position ?? 0,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as TaskAttachmentRow)
}

export async function updateTaskAttachment(
  id: string,
  patch: Partial<Pick<TaskAttachment, "url" | "label" | "position">>
): Promise<TaskAttachment> {
  const row: Record<string, unknown> = {}
  if (patch.url !== undefined) row.url = patch.url
  if (patch.label !== undefined) row.label = patch.label
  if (patch.position !== undefined) row.position = patch.position
  const { data, error } = await supabase
    .from("task_attachments")
    .update(row)
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as TaskAttachmentRow)
}

export async function deleteTaskAttachment(id: string): Promise<void> {
  const { error } = await supabase.from("task_attachments").delete().eq("id", id)
  if (error) throw error
}

export const TASK_ATTACHMENT_KIND_LABEL: Record<TaskAttachmentKind, string> = {
  briefing_loom: "Briefing Loom",
  briefing_doc: "Briefing material",
  completion_loom: "Completion Loom",
  completion_doc: "Completion material",
}

const TASK_MATERIALS_BUCKET = "task-materials"

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

/** Upload a file to the task-materials bucket and return the public URL. */
export async function uploadTaskFile(
  taskId: string,
  file: File
): Promise<string> {
  const path = `tasks/${taskId}/${Date.now()}-${sanitizeFileName(file.name)}`
  const { error } = await supabase.storage
    .from(TASK_MATERIALS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    })
  if (error) throw error
  const { data } = supabase.storage
    .from(TASK_MATERIALS_BUCKET)
    .getPublicUrl(path)
  return data.publicUrl
}
