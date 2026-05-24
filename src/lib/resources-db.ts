import { supabase } from "@/lib/supabase"
import type { StatusTone } from "@/lib/status-colors"

export type Resource = {
  id: string
  projectId: string
  sectionId: string | null
  name: string
  value: string
  isSensitive: boolean
  position: number
  createdAt: string
}

export type ResourceSection = {
  id: string
  projectId: string
  name: string
  color: StatusTone
  position: number
  createdAt: string
  updatedAt: string
}

type ResourceRow = {
  id: string
  project_id: string
  section_id: string | null
  name: string
  value: string
  is_sensitive: boolean
  position: number
  created_at: string
}

type ResourceSectionRow = {
  id: string
  project_id: string
  name: string
  color: StatusTone
  position: number
  created_at: string
  updated_at: string
}

const RESOURCE_COLUMNS =
  "id, project_id, section_id, name, value, is_sensitive, position, created_at"

const SECTION_COLUMNS =
  "id, project_id, name, color, position, created_at, updated_at"

function fromResourceRow(r: ResourceRow): Resource {
  return {
    id: r.id,
    projectId: r.project_id,
    sectionId: r.section_id,
    name: r.name,
    value: r.value,
    isSensitive: r.is_sensitive,
    position: r.position,
    createdAt: r.created_at,
  }
}

function fromSectionRow(r: ResourceSectionRow): ResourceSection {
  return {
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    color: r.color,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// ─── resources ──────────────────────────────────────────────────────────────

export async function listResources(projectId: string): Promise<Resource[]> {
  const { data, error } = await supabase
    .from("resources")
    .select(RESOURCE_COLUMNS)
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data as ResourceRow[]).map(fromResourceRow)
}

export async function insertResource(input: {
  projectId: string
  sectionId: string | null
  name: string
  value: string
  isSensitive?: boolean
  position?: number
}): Promise<Resource> {
  const { data, error } = await supabase
    .from("resources")
    .insert({
      project_id: input.projectId,
      section_id: input.sectionId,
      name: input.name.trim(),
      value: input.value,
      is_sensitive: input.isSensitive ?? false,
      position: input.position ?? 0,
    })
    .select(RESOURCE_COLUMNS)
    .single()
  if (error) throw error
  return fromResourceRow(data as ResourceRow)
}

export async function updateResource(
  id: string,
  patch: Partial<Pick<Resource, "name" | "value" | "isSensitive" | "sectionId" | "position">>
): Promise<Resource> {
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.value !== undefined) row.value = patch.value
  if (patch.isSensitive !== undefined) row.is_sensitive = patch.isSensitive
  if (patch.sectionId !== undefined) row.section_id = patch.sectionId
  if (patch.position !== undefined) row.position = patch.position
  const { data, error } = await supabase
    .from("resources")
    .update(row)
    .eq("id", id)
    .select(RESOURCE_COLUMNS)
    .single()
  if (error) throw error
  return fromResourceRow(data as ResourceRow)
}

export async function deleteResource(id: string): Promise<void> {
  const { error } = await supabase.from("resources").delete().eq("id", id)
  if (error) throw error
}

// Bulk renumber resources after a drag. `entries` carries the new section_id
// and position for every resource whose placement changed.
export async function reorderResources(
  entries: { id: string; sectionId: string | null; position: number }[]
): Promise<void> {
  if (entries.length === 0) return
  await Promise.all(
    entries.map((e) =>
      supabase
        .from("resources")
        .update({ section_id: e.sectionId, position: e.position })
        .eq("id", e.id)
    )
  )
}

// ─── sections ───────────────────────────────────────────────────────────────

export async function listResourceSections(
  projectId: string
): Promise<ResourceSection[]> {
  const { data, error } = await supabase
    .from("resource_sections")
    .select(SECTION_COLUMNS)
    .eq("project_id", projectId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data as ResourceSectionRow[]).map(fromSectionRow)
}

export async function insertResourceSection(input: {
  projectId: string
  name: string
  color?: StatusTone
  position?: number
}): Promise<ResourceSection> {
  const { data, error } = await supabase
    .from("resource_sections")
    .insert({
      project_id: input.projectId,
      name: input.name.trim(),
      color: input.color ?? "neutral",
      position: input.position ?? 0,
    })
    .select(SECTION_COLUMNS)
    .single()
  if (error) throw error
  return fromSectionRow(data as ResourceSectionRow)
}

export async function updateResourceSection(
  id: string,
  patch: Partial<Pick<ResourceSection, "name" | "color" | "position">>
): Promise<ResourceSection> {
  const row: Record<string, unknown> = {}
  if (patch.name !== undefined) row.name = patch.name
  if (patch.color !== undefined) row.color = patch.color
  if (patch.position !== undefined) row.position = patch.position
  const { data, error } = await supabase
    .from("resource_sections")
    .update(row)
    .eq("id", id)
    .select(SECTION_COLUMNS)
    .single()
  if (error) throw error
  return fromSectionRow(data as ResourceSectionRow)
}

export async function deleteResourceSection(id: string): Promise<void> {
  const { error } = await supabase.from("resource_sections").delete().eq("id", id)
  if (error) throw error
}

export async function reorderResourceSections(
  entries: { id: string; position: number }[]
): Promise<void> {
  if (entries.length === 0) return
  await Promise.all(
    entries.map((e) =>
      supabase
        .from("resource_sections")
        .update({ position: e.position })
        .eq("id", e.id)
    )
  )
}
