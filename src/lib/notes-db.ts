import { supabase } from "@/lib/supabase"

// Loose alias — BlockNote's PartialBlock[] is the source of truth, but we don't
// want this module to depend on the editor package. The JSON shape is opaque to
// the DB layer; the editor is responsible for parsing it back.
export type NoteBlocks = unknown[]

export type ProjectNote = {
  id: string
  projectId: string
  content: string
  contentBlocks: NoteBlocks | null
  convertedTaskId: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

type ProjectNoteRow = {
  id: string
  project_id: string
  content: string
  content_blocks: NoteBlocks | null
  converted_task_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

const COLUMNS =
  "id, project_id, content, content_blocks, converted_task_id, created_by, created_at, updated_at"

function fromRow(r: ProjectNoteRow): ProjectNote {
  return {
    id: r.id,
    projectId: r.project_id,
    content: r.content,
    contentBlocks: r.content_blocks,
    convertedTaskId: r.converted_task_id,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listNotes(projectId: string): Promise<ProjectNote[]> {
  const { data, error } = await supabase
    .from("project_notes")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data as ProjectNoteRow[]).map(fromRow)
}

export async function insertNote(input: {
  projectId: string
  content: string
  contentBlocks?: NoteBlocks | null
}): Promise<ProjectNote> {
  const { data: userRes } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from("project_notes")
    .insert({
      project_id: input.projectId,
      content: input.content.trim(),
      content_blocks: input.contentBlocks ?? null,
      created_by: userRes.user?.id ?? null,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as ProjectNoteRow)
}

export async function updateNote(
  id: string,
  patch: {
    content?: string
    contentBlocks?: NoteBlocks | null
    convertedTaskId?: string | null
  }
): Promise<ProjectNote> {
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.content !== undefined) dbPatch.content = patch.content.trim()
  if (patch.contentBlocks !== undefined)
    dbPatch.content_blocks = patch.contentBlocks
  if (patch.convertedTaskId !== undefined)
    dbPatch.converted_task_id = patch.convertedTaskId
  const { data, error } = await supabase
    .from("project_notes")
    .update(dbPatch)
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as ProjectNoteRow)
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from("project_notes").delete().eq("id", id)
  if (error) throw error
}
