import { supabase } from "@/lib/supabase"

export type Meeting = {
  id: string
  projectId: string
  title: string
  scheduledAt: string | null
  meetingUrl: string | null
  fathomUrl: string | null
  notes: string | null
  transcript: string | null
  createdAt: string
  updatedAt: string
}

type MeetingRow = {
  id: string
  project_id: string
  title: string
  scheduled_at: string | null
  meeting_url: string | null
  fathom_url: string | null
  notes: string | null
  transcript: string | null
  created_at: string
  updated_at: string
}

const COLUMNS =
  "id, project_id, title, scheduled_at, meeting_url, fathom_url, notes, transcript, created_at, updated_at"

function fromRow(r: MeetingRow): Meeting {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    scheduledAt: r.scheduled_at,
    meetingUrl: r.meeting_url,
    fathomUrl: r.fathom_url,
    notes: r.notes,
    transcript: r.transcript,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listMeetings(projectId: string): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data as MeetingRow[]).map(fromRow)
}

export async function insertMeeting(input: {
  projectId: string
  title: string
  scheduledAt?: string | null
  meetingUrl?: string | null
  fathomUrl?: string | null
  notes?: string | null
  transcript?: string | null
}): Promise<Meeting> {
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      project_id: input.projectId,
      title: input.title.trim(),
      scheduled_at: input.scheduledAt ?? null,
      meeting_url: input.meetingUrl ?? null,
      fathom_url: input.fathomUrl ?? null,
      notes: input.notes ?? null,
      transcript: input.transcript ?? null,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as MeetingRow)
}

export async function updateMeeting(
  id: string,
  patch: Partial<
    Pick<
      Meeting,
      "title" | "scheduledAt" | "meetingUrl" | "fathomUrl" | "notes" | "transcript"
    >
  >
): Promise<Meeting> {
  const row: Record<string, unknown> = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.scheduledAt !== undefined) row.scheduled_at = patch.scheduledAt
  if (patch.meetingUrl !== undefined) row.meeting_url = patch.meetingUrl
  if (patch.fathomUrl !== undefined) row.fathom_url = patch.fathomUrl
  if (patch.notes !== undefined) row.notes = patch.notes
  if (patch.transcript !== undefined) row.transcript = patch.transcript
  const { data, error } = await supabase
    .from("meetings")
    .update(row)
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as MeetingRow)
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from("meetings").delete().eq("id", id)
  if (error) throw error
}
