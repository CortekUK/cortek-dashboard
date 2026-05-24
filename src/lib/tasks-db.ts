import { supabase } from "@/lib/supabase"

export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "in_review"
  | "completed"

export type TaskSource = "manual" | "fathom"

export type TaskPriority = "low" | "medium" | "high" | "urgent"

export type Task = {
  id: string
  projectId: string
  phaseId: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee: string | null
  startDate: string | null
  dueDate: string | null
  position: number
  source: TaskSource
  branchName: string | null
  prTargetBranch: string | null
  prUrl: string | null
  estimatedHours: number | null
  actualHours: number | null
  createdAt: string
  updatedAt: string
}

type TaskRow = {
  id: string
  project_id: string
  phase_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee: string | null
  start_date: string | null
  due_date: string | null
  position: number
  source: TaskSource
  branch_name: string | null
  pr_target_branch: string | null
  pr_url: string | null
  estimated_hours: number | string | null
  actual_hours: number | string | null
  created_at: string
  updated_at: string
}

const COLUMNS =
  "id, project_id, phase_id, title, description, status, priority, assignee, start_date, due_date, position, source, branch_name, pr_target_branch, pr_url, estimated_hours, actual_hours, created_at, updated_at"

function toNumberOrNull(v: number | string | null): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function fromRow(r: TaskRow): Task {
  return {
    id: r.id,
    projectId: r.project_id,
    phaseId: r.phase_id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority ?? "medium",
    assignee: r.assignee,
    startDate: r.start_date,
    dueDate: r.due_date,
    position: r.position,
    source: r.source,
    branchName: r.branch_name,
    prTargetBranch: r.pr_target_branch,
    prUrl: r.pr_url,
    estimatedHours: toNumberOrNull(r.estimated_hours),
    actualHours: toNumberOrNull(r.actual_hours),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data ? fromRow(data as TaskRow) : null
}

export async function listDistinctAssignees(
  projectId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("assignee")
    .eq("project_id", projectId)
    .not("assignee", "is", null)
  if (error) throw error
  const set = new Set<string>()
  for (const row of data ?? []) {
    const a = (row as { assignee: string | null }).assignee
    if (a && a.trim()) set.add(a.trim())
  }
  return [...set].sort()
}

export async function listTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data as TaskRow[]).map(fromRow)
}

export async function insertTask(input: {
  projectId: string
  phaseId?: string | null
  title: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  assignee?: string | null
  dueDate?: string | null
  position?: number
  source?: TaskSource
}): Promise<Task> {
  const row: Record<string, unknown> = {
    project_id: input.projectId,
    phase_id: input.phaseId ?? null,
    title: input.title.trim(),
    description: input.description ?? null,
    status: input.status ?? "not_started",
    priority: input.priority ?? "medium",
    assignee: input.assignee ?? null,
    due_date: input.dueDate ?? null,
    source: input.source ?? "manual",
  }
  if (input.position !== undefined) row.position = input.position
  const { data, error } = await supabase
    .from("tasks")
    .insert(row)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as TaskRow)
}

export async function bulkInsertTasks(
  inputs: Array<{
    projectId: string
    phaseId?: string | null
    title: string
    description?: string | null
    source?: TaskSource
  }>
): Promise<Task[]> {
  if (inputs.length === 0) return []
  const { data, error } = await supabase
    .from("tasks")
    .insert(
      inputs.map((i) => ({
        project_id: i.projectId,
        phase_id: i.phaseId ?? null,
        title: i.title.trim(),
        description: i.description ?? null,
        source: i.source ?? "manual",
      }))
    )
    .select(COLUMNS)
  if (error) throw error
  return (data as TaskRow[]).map(fromRow)
}

export async function updateTask(
  id: string,
  patch: Partial<
    Pick<
      Task,
      | "title"
      | "description"
      | "status"
      | "priority"
      | "assignee"
      | "startDate"
      | "dueDate"
      | "phaseId"
      | "position"
      | "branchName"
      | "prTargetBranch"
      | "prUrl"
      | "estimatedHours"
      | "actualHours"
    >
  >
): Promise<Task> {
  const row: Record<string, unknown> = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.description !== undefined) row.description = patch.description
  if (patch.status !== undefined) row.status = patch.status
  if (patch.priority !== undefined) row.priority = patch.priority
  if (patch.assignee !== undefined) row.assignee = patch.assignee
  if (patch.startDate !== undefined) row.start_date = patch.startDate
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate
  if (patch.phaseId !== undefined) row.phase_id = patch.phaseId
  if (patch.position !== undefined) row.position = patch.position
  if (patch.branchName !== undefined) row.branch_name = patch.branchName
  if (patch.prTargetBranch !== undefined) row.pr_target_branch = patch.prTargetBranch
  if (patch.prUrl !== undefined) row.pr_url = patch.prUrl
  if (patch.estimatedHours !== undefined) row.estimated_hours = patch.estimatedHours
  if (patch.actualHours !== undefined) row.actual_hours = patch.actualHours
  const { data, error } = await supabase
    .from("tasks")
    .update(row)
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as TaskRow)
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id)
  if (error) throw error
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  in_review: "In review",
  completed: "Completed",
}

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "not_started",
  "in_progress",
  "in_review",
  "completed",
]

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
}

export const TASK_PRIORITY_ORDER: TaskPriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
]

export const TASK_PRIORITY_RANK: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}
