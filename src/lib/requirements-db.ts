import { supabase } from "@/lib/supabase"

export type RequirementStatus = "open" | "received"

export type Requirement = {
  id: string
  projectId: string
  title: string
  description: string | null
  steps: string[]
  status: RequirementStatus
  createdAt: string
  updatedAt: string
}

type RequirementRow = {
  id: string
  project_id: string
  title: string
  description: string | null
  steps: string[] | null
  status: RequirementStatus
  created_at: string
  updated_at: string
}

const COLUMNS =
  "id, project_id, title, description, steps, status, created_at, updated_at"

function fromRow(r: RequirementRow): Requirement {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    description: r.description,
    steps: r.steps ?? [],
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function listRequirements(
  projectId: string
): Promise<Requirement[]> {
  const { data, error } = await supabase
    .from("requirements")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data as RequirementRow[]).map(fromRow)
}

export async function insertRequirement(input: {
  projectId: string
  title: string
  description?: string | null
  steps?: string[]
}): Promise<Requirement> {
  const { data, error } = await supabase
    .from("requirements")
    .insert({
      project_id: input.projectId,
      title: input.title.trim(),
      description: input.description ?? null,
      steps: input.steps ?? [],
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as RequirementRow)
}

export async function updateRequirement(
  id: string,
  patch: Partial<Pick<Requirement, "title" | "description" | "steps" | "status">>
): Promise<Requirement> {
  const row: Record<string, unknown> = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.description !== undefined) row.description = patch.description
  if (patch.steps !== undefined) row.steps = patch.steps
  if (patch.status !== undefined) row.status = patch.status
  const { data, error } = await supabase
    .from("requirements")
    .update(row)
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as RequirementRow)
}

export async function deleteRequirement(id: string): Promise<void> {
  const { error } = await supabase.from("requirements").delete().eq("id", id)
  if (error) throw error
}
