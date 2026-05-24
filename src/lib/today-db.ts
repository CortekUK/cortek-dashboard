import { supabase } from "@/lib/supabase"

export type TodayPick = {
  id: string
  projectId: string
  taskId: string | null
  pickDate: string
  note: string | null
  position: number
  createdAt: string
}

type TodayPickRow = {
  id: string
  project_id: string
  task_id: string | null
  pick_date: string
  note: string | null
  position: number
  created_at: string
}

const COLUMNS =
  "id, project_id, task_id, pick_date, note, position, created_at"

function fromRow(r: TodayPickRow): TodayPick {
  return {
    id: r.id,
    projectId: r.project_id,
    taskId: r.task_id,
    pickDate: r.pick_date,
    note: r.note,
    position: r.position,
    createdAt: r.created_at,
  }
}

export function isoToday(): string {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)
}

export async function listTodayPicks(
  projectId: string,
  pickDate: string = isoToday()
): Promise<TodayPick[]> {
  const { data, error } = await supabase
    .from("today_picks")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .eq("pick_date", pickDate)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data as TodayPickRow[]).map(fromRow)
}

export async function insertTodayPick(input: {
  projectId: string
  taskId?: string | null
  note?: string | null
  pickDate?: string
  position?: number
}): Promise<TodayPick> {
  const { data, error } = await supabase
    .from("today_picks")
    .insert({
      project_id: input.projectId,
      task_id: input.taskId ?? null,
      note: input.note ?? null,
      pick_date: input.pickDate ?? isoToday(),
      position: input.position ?? 0,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as TodayPickRow)
}

export async function deleteTodayPick(id: string): Promise<void> {
  const { error } = await supabase.from("today_picks").delete().eq("id", id)
  if (error) throw error
}

export async function reorderTodayPicks(orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return
  await Promise.all(
    orderedIds.map((id, position) =>
      supabase.from("today_picks").update({ position }).eq("id", id)
    )
  )
}
