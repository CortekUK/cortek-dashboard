import { supabase } from "@/lib/supabase"

export type MeetingChecklistItem = {
  id: string
  meetingId: string
  title: string
  done: boolean
  position: number
  createdAt: string
  updatedAt: string
}

type MeetingChecklistRow = {
  id: string
  meeting_id: string
  title: string
  done: boolean
  position: number
  created_at: string
  updated_at: string
}

const COLUMNS = "id, meeting_id, title, done, position, created_at, updated_at"

function fromRow(r: MeetingChecklistRow): MeetingChecklistItem {
  return {
    id: r.id,
    meetingId: r.meeting_id,
    title: r.title,
    done: r.done,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listMeetingChecklistItems(
  meetingId: string
): Promise<MeetingChecklistItem[]> {
  const { data, error } = await supabase
    .from("meeting_checklist_items")
    .select(COLUMNS)
    .eq("meeting_id", meetingId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data as MeetingChecklistRow[]).map(fromRow)
}

export async function insertMeetingChecklistItem(input: {
  meetingId: string
  title: string
  position?: number
}): Promise<MeetingChecklistItem> {
  const { data, error } = await supabase
    .from("meeting_checklist_items")
    .insert({
      meeting_id: input.meetingId,
      title: input.title.trim(),
      position: input.position ?? 0,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as MeetingChecklistRow)
}

export async function updateMeetingChecklistItem(
  id: string,
  patch: Partial<Pick<MeetingChecklistItem, "title" | "done" | "position">>
): Promise<MeetingChecklistItem> {
  const row: Record<string, unknown> = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.done !== undefined) row.done = patch.done
  if (patch.position !== undefined) row.position = patch.position
  const { data, error } = await supabase
    .from("meeting_checklist_items")
    .update(row)
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as MeetingChecklistRow)
}

export async function deleteMeetingChecklistItem(id: string): Promise<void> {
  const { error } = await supabase
    .from("meeting_checklist_items")
    .delete()
    .eq("id", id)
  if (error) throw error
}
