import { supabase } from "@/lib/supabase"
import type { TaskStatus } from "@/lib/tasks-db"

export type Phase = {
  id: string
  projectId: string
  name: string
  position: number
  status: TaskStatus
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
}

type PhaseRow = {
  id: string
  project_id: string
  name: string
  position: number
  status: TaskStatus
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

function fromRow(r: PhaseRow): Phase {
  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    position: r.position,
    status: r.status,
    startDate: r.start_date,
    endDate: r.end_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

const COLUMNS =
  "id, project_id, name, position, status, start_date, end_date, created_at, updated_at"

export async function getPhase(id: string): Promise<Phase | null> {
  const { data, error } = await supabase
    .from("phases")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data ? fromRow(data as PhaseRow) : null
}

export async function listPhases(projectId: string): Promise<Phase[]> {
  const { data, error } = await supabase
    .from("phases")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data as PhaseRow[]).map(fromRow)
}

export async function insertPhase(input: {
  projectId: string
  name: string
  position?: number
  startDate?: string | null
  endDate?: string | null
}): Promise<Phase> {
  const { data, error } = await supabase
    .from("phases")
    .insert({
      project_id: input.projectId,
      name: input.name.trim(),
      position: input.position ?? 0,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as PhaseRow)
}

export async function updatePhase(
  id: string,
  patch: Partial<
    Pick<Phase, "name" | "position" | "status" | "startDate" | "endDate">
  >
): Promise<Phase> {
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.position !== undefined) row.position = patch.position
  if (patch.status !== undefined) row.status = patch.status
  if (patch.startDate !== undefined) row.start_date = patch.startDate
  if (patch.endDate !== undefined) row.end_date = patch.endDate
  const { data, error } = await supabase
    .from("phases")
    .update(row)
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as PhaseRow)
}

export async function deletePhase(id: string): Promise<void> {
  const { error } = await supabase.from("phases").delete().eq("id", id)
  if (error) throw error
}
