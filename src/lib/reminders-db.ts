import { supabase } from "@/lib/supabase"

export type Reminder = {
  id: string
  projectId: string
  title: string
  remindAt: string | null
  completed: boolean
  createdAt: string
}

type ReminderRow = {
  id: string
  project_id: string
  title: string
  remind_at: string | null
  completed: boolean
  created_at: string
}

const COLUMNS = "id, project_id, title, remind_at, completed, created_at"

function fromRow(r: ReminderRow): Reminder {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    remindAt: r.remind_at,
    completed: r.completed,
    createdAt: r.created_at,
  }
}

export async function listReminders(projectId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from("reminders")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .order("completed", { ascending: true })
    .order("remind_at", { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data as ReminderRow[]).map(fromRow)
}

export async function insertReminder(input: {
  projectId: string
  title: string
  remindAt?: string | null
}): Promise<Reminder> {
  const { data, error } = await supabase
    .from("reminders")
    .insert({
      project_id: input.projectId,
      title: input.title.trim(),
      remind_at: input.remindAt ?? null,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as ReminderRow)
}

export async function updateReminder(
  id: string,
  patch: Partial<Pick<Reminder, "title" | "remindAt" | "completed">>
): Promise<Reminder> {
  const row: Record<string, unknown> = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.remindAt !== undefined) row.remind_at = patch.remindAt
  if (patch.completed !== undefined) row.completed = patch.completed
  const { data, error } = await supabase
    .from("reminders")
    .update(row)
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as ReminderRow)
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from("reminders").delete().eq("id", id)
  if (error) throw error
}
