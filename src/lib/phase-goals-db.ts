import { supabase } from "@/lib/supabase"

export type PhaseGoal = {
  id: string
  phaseId: string
  text: string
  achieved: boolean
  position: number
  createdAt: string
  updatedAt: string
}

type PhaseGoalRow = {
  id: string
  phase_id: string
  text: string
  achieved: boolean
  position: number
  created_at: string
  updated_at: string
}

const COLUMNS =
  "id, phase_id, text, achieved, position, created_at, updated_at"

function fromRow(r: PhaseGoalRow): PhaseGoal {
  return {
    id: r.id,
    phaseId: r.phase_id,
    text: r.text,
    achieved: r.achieved,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listPhaseGoals(phaseId: string): Promise<PhaseGoal[]> {
  const { data, error } = await supabase
    .from("phase_goals")
    .select(COLUMNS)
    .eq("phase_id", phaseId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data as PhaseGoalRow[]).map(fromRow)
}

export async function listGoalsForPhases(
  phaseIds: string[]
): Promise<PhaseGoal[]> {
  if (phaseIds.length === 0) return []
  const { data, error } = await supabase
    .from("phase_goals")
    .select(COLUMNS)
    .in("phase_id", phaseIds)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data as PhaseGoalRow[]).map(fromRow)
}

export async function insertPhaseGoal(input: {
  phaseId: string
  text: string
  position?: number
}): Promise<PhaseGoal> {
  const { data, error } = await supabase
    .from("phase_goals")
    .insert({
      phase_id: input.phaseId,
      text: input.text.trim(),
      position: input.position ?? 0,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as PhaseGoalRow)
}

export async function updatePhaseGoal(
  id: string,
  patch: Partial<Pick<PhaseGoal, "text" | "achieved" | "position">>
): Promise<PhaseGoal> {
  const row: Record<string, unknown> = {}
  if (patch.text !== undefined) row.text = patch.text
  if (patch.achieved !== undefined) row.achieved = patch.achieved
  if (patch.position !== undefined) row.position = patch.position
  const { data, error } = await supabase
    .from("phase_goals")
    .update(row)
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as PhaseGoalRow)
}

export async function deletePhaseGoal(id: string): Promise<void> {
  const { error } = await supabase.from("phase_goals").delete().eq("id", id)
  if (error) throw error
}
