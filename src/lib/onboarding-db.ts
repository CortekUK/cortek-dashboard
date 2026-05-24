import { supabase } from "@/lib/supabase"

export type OnboardingStep = {
  id: string
  projectId: string
  title: string
  body: string | null
  position: number
  done: boolean
  createdAt: string
  updatedAt: string
}

type OnboardingRow = {
  id: string
  project_id: string
  title: string
  body: string | null
  position: number
  done: boolean
  created_at: string
  updated_at: string
}

const COLUMNS =
  "id, project_id, title, body, position, done, created_at, updated_at"

function fromRow(r: OnboardingRow): OnboardingStep {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    body: r.body,
    position: r.position,
    done: r.done,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listOnboardingSteps(
  projectId: string
): Promise<OnboardingStep[]> {
  const { data, error } = await supabase
    .from("onboarding_steps")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data as OnboardingRow[]).map(fromRow)
}

export async function insertOnboardingStep(input: {
  projectId: string
  title: string
  body?: string | null
  position?: number
}): Promise<OnboardingStep> {
  const { data, error } = await supabase
    .from("onboarding_steps")
    .insert({
      project_id: input.projectId,
      title: input.title.trim(),
      body: input.body ?? null,
      position: input.position ?? 0,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as OnboardingRow)
}

export async function updateOnboardingStep(
  id: string,
  patch: Partial<Pick<OnboardingStep, "title" | "body" | "done" | "position">>
): Promise<OnboardingStep> {
  const row: Record<string, unknown> = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.body !== undefined) row.body = patch.body
  if (patch.done !== undefined) row.done = patch.done
  if (patch.position !== undefined) row.position = patch.position
  const { data, error } = await supabase
    .from("onboarding_steps")
    .update(row)
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as OnboardingRow)
}

export async function deleteOnboardingStep(id: string): Promise<void> {
  const { error } = await supabase.from("onboarding_steps").delete().eq("id", id)
  if (error) throw error
}

export async function updateProjectOnboardingOverview(
  projectId: string,
  overview: string | null
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ onboarding_overview: overview })
    .eq("id", projectId)
  if (error) throw error
}

export async function getProjectOnboardingOverview(
  projectId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("onboarding_overview")
    .eq("id", projectId)
    .maybeSingle()
  if (error) throw error
  return (data?.onboarding_overview as string | null) ?? null
}
