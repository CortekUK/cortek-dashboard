import { supabase } from "@/lib/supabase"

export type FathomTranscript = {
  id: string
  projectId: string
  transcript: string
  fathomUrl: string | null
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

type FathomTranscriptRow = {
  id: string
  project_id: string
  transcript: string
  fathom_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

const COLUMNS =
  "id, project_id, transcript, fathom_url, created_by, created_at, updated_at"

function fromRow(r: FathomTranscriptRow): FathomTranscript {
  return {
    id: r.id,
    projectId: r.project_id,
    transcript: r.transcript,
    fathomUrl: r.fathom_url,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listFathomTranscripts(
  projectId: string
): Promise<FathomTranscript[]> {
  const { data, error } = await supabase
    .from("project_fathom_transcripts")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data as FathomTranscriptRow[]).map(fromRow)
}

export async function insertFathomTranscript(input: {
  projectId: string
  transcript: string
  fathomUrl?: string | null
}): Promise<FathomTranscript> {
  const { data: userRes } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from("project_fathom_transcripts")
    .insert({
      project_id: input.projectId,
      transcript: input.transcript.trim(),
      fathom_url: input.fathomUrl?.trim() || null,
      created_by: userRes.user?.id ?? null,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as FathomTranscriptRow)
}

export async function deleteFathomTranscript(id: string): Promise<void> {
  const { error } = await supabase
    .from("project_fathom_transcripts")
    .delete()
    .eq("id", id)
  if (error) throw error
}
