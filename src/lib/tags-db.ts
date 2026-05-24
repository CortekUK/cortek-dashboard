import { supabase } from "@/lib/supabase"
import type { StatusTone } from "@/lib/status-colors"

export type TagColor = StatusTone

export type Tag = {
  id: string
  projectId: string
  name: string
  color: TagColor
  createdAt: string
}

type TagRow = {
  id: string
  project_id: string
  name: string
  color: string
  created_at: string
}

const TAG_COLUMNS = "id, project_id, name, color, created_at"

const VALID_COLORS: TagColor[] = [
  "neutral",
  "info",
  "warning",
  "success",
  "primary",
  "destructive",
]

function isTagColor(value: string): value is TagColor {
  return (VALID_COLORS as string[]).includes(value)
}

function fromRow(r: TagRow): Tag {
  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    color: isTagColor(r.color) ? r.color : "neutral",
    createdAt: r.created_at,
  }
}

export async function listTags(projectId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select(TAG_COLUMNS)
    .eq("project_id", projectId)
    .order("name", { ascending: true })
  if (error) throw error
  return (data as TagRow[]).map(fromRow)
}

export async function listTaskTags(taskId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("task_tags")
    .select(`tag:tags(${TAG_COLUMNS})`)
    .eq("task_id", taskId)
  if (error) throw error
  type JoinRow = { tag: TagRow | null }
  const rows = (data ?? []) as unknown as JoinRow[]
  return rows
    .map((r) => r.tag)
    .filter((t): t is TagRow => t !== null)
    .map(fromRow)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function createTag(input: {
  projectId: string
  name: string
  color?: TagColor
}): Promise<Tag> {
  const { data, error } = await supabase
    .from("tags")
    .insert({
      project_id: input.projectId,
      name: input.name.trim(),
      color: input.color ?? "neutral",
    })
    .select(TAG_COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as TagRow)
}

export async function updateTag(
  id: string,
  patch: Partial<Pick<Tag, "name" | "color">>
): Promise<Tag> {
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.color !== undefined) row.color = patch.color
  const { data, error } = await supabase
    .from("tags")
    .update(row)
    .eq("id", id)
    .select(TAG_COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as TagRow)
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from("tags").delete().eq("id", id)
  if (error) throw error
}

export async function attachTagToTask(
  taskId: string,
  tagId: string
): Promise<void> {
  const { error } = await supabase
    .from("task_tags")
    .insert({ task_id: taskId, tag_id: tagId })
  // 23505 = unique violation; treat as no-op.
  if (error && (error as { code?: string }).code !== "23505") throw error
}

export async function detachTagFromTask(
  taskId: string,
  tagId: string
): Promise<void> {
  const { error } = await supabase
    .from("task_tags")
    .delete()
    .eq("task_id", taskId)
    .eq("tag_id", tagId)
  if (error) throw error
}

export const TAG_COLOR_ORDER: TagColor[] = VALID_COLORS
