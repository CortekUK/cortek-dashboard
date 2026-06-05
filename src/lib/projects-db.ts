import { supabase } from "@/lib/supabase"

export type ProjectStage = "demo" | "in_progress" | "archived"

export type Project = {
  id: string
  clientName: string
  projectName: string
  developerName: string | null
  stage: ProjectStage
  startDate: string | null
  endDate: string | null
  liveUrl: string | null
  demoUsername: string | null
  demoPassword: string | null
  createdAt: string
  updatedAt: string
}

type ProjectRow = {
  id: string
  client_name: string
  project_name: string
  developer_name: string | null
  stage: ProjectStage
  start_date: string | null
  end_date: string | null
  live_url: string | null
  demo_username: string | null
  demo_password: string | null
  created_at: string
  updated_at: string
}

const COLUMNS =
  "id, client_name, project_name, developer_name, stage, start_date, end_date, live_url, demo_username, demo_password, created_at, updated_at"

function fromRow(row: ProjectRow): Project {
  return {
    id: row.id,
    clientName: row.client_name,
    projectName: row.project_name,
    developerName: row.developer_name,
    stage: row.stage,
    startDate: row.start_date,
    endDate: row.end_date,
    liveUrl: row.live_url,
    demoUsername: row.demo_username,
    demoPassword: row.demo_password,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data ? fromRow(data as ProjectRow) : null
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data as ProjectRow[]).map(fromRow)
}

export async function insertProject(input: {
  clientName: string
  projectName: string
  stage?: ProjectStage
  startDate?: string | null
  endDate?: string | null
}): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      client_name: input.clientName,
      project_name: input.projectName,
      stage: input.stage ?? "demo",
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as ProjectRow)
}

export async function updateProjectStage(
  id: string,
  stage: ProjectStage
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update({ stage })
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as ProjectRow)
}

export async function updateProjectName(
  id: string,
  projectName: string
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update({ project_name: projectName })
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as ProjectRow)
}

export async function updateProjectClientName(
  id: string,
  clientName: string
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update({ client_name: clientName })
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as ProjectRow)
}

export async function updateProjectDeveloperName(
  id: string,
  developerName: string | null
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update({ developer_name: developerName })
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as ProjectRow)
}

export async function updateProjectDates(
  id: string,
  patch: { startDate: string | null; endDate: string | null }
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update({
      start_date: patch.startDate,
      end_date: patch.endDate,
    })
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as ProjectRow)
}

export async function updateProjectLiveUrl(
  id: string,
  liveUrl: string | null
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update({ live_url: liveUrl })
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as ProjectRow)
}

export async function updateProjectDemoCredentials(
  id: string,
  patch: { demoUsername: string | null; demoPassword: string | null }
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update({
      demo_username: patch.demoUsername,
      demo_password: patch.demoPassword,
    })
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as ProjectRow)
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id)
  if (error) throw error
}

export async function bulkInsertProjects(
  inputs: Array<{ clientName: string; projectName: string; stage?: ProjectStage }>
): Promise<Project[]> {
  if (inputs.length === 0) return []
  const { data, error } = await supabase
    .from("projects")
    .insert(
      inputs.map((i) => ({
        client_name: i.clientName,
        project_name: i.projectName,
        stage: i.stage ?? "demo",
      }))
    )
    .select(COLUMNS)
  if (error) throw error
  return (data as ProjectRow[]).map(fromRow)
}
