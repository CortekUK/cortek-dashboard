import { supabase } from "@/lib/supabase"

export const DOCUMENT_CATEGORIES = [
  "agreement",
  "invoice",
  "proposal",
  "brief",
  "other",
] as const

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]

export const DOCUMENT_CATEGORY_LABEL: Record<DocumentCategory, string> = {
  agreement: "Agreement",
  invoice: "Invoice",
  proposal: "Proposal",
  brief: "Brief",
  other: "Other",
}

export type ProjectDocument = {
  id: string
  projectId: string
  category: DocumentCategory
  name: string
  storagePath: string
  mimeType: string | null
  sizeBytes: number | null
  amount: number | null
  notes: string | null
  replacesId: string | null
  uploadedBy: string | null
  uploadedAt: string
}

type ProjectDocumentRow = {
  id: string
  project_id: string
  category: DocumentCategory
  name: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  amount: number | null
  notes: string | null
  replaces_id: string | null
  uploaded_by: string | null
  uploaded_at: string
}

const COLUMNS =
  "id, project_id, category, name, storage_path, mime_type, size_bytes, amount, notes, replaces_id, uploaded_by, uploaded_at"

const BUCKET = "project-documents"

function fromRow(r: ProjectDocumentRow): ProjectDocument {
  return {
    id: r.id,
    projectId: r.project_id,
    category: r.category,
    name: r.name,
    storagePath: r.storage_path,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes,
    amount: r.amount,
    notes: r.notes,
    replacesId: r.replaces_id,
    uploadedBy: r.uploaded_by,
    uploadedAt: r.uploaded_at,
  }
}

export async function listDocuments(
  projectId: string
): Promise<ProjectDocument[]> {
  const { data, error } = await supabase
    .from("project_documents")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false })
  if (error) throw error
  return (data as ProjectDocumentRow[]).map(fromRow)
}

// Current agreement = the latest agreement row that nothing else replaces.
// (We chain via replaces_id when a new version is uploaded.)
export async function getCurrentAgreement(
  projectId: string
): Promise<ProjectDocument | null> {
  const { data, error } = await supabase
    .from("project_documents")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .eq("category", "agreement")
    .order("uploaded_at", { ascending: false })
    .limit(1)
  if (error) throw error
  const rows = data as ProjectDocumentRow[]
  return rows.length ? fromRow(rows[0]) : null
}

export async function listAgreementVersions(
  projectId: string
): Promise<ProjectDocument[]> {
  const { data, error } = await supabase
    .from("project_documents")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .eq("category", "agreement")
    .order("uploaded_at", { ascending: false })
  if (error) throw error
  return (data as ProjectDocumentRow[]).map(fromRow)
}

export async function listInvoices(
  projectId: string
): Promise<ProjectDocument[]> {
  const { data, error } = await supabase
    .from("project_documents")
    .select(COLUMNS)
    .eq("project_id", projectId)
    .eq("category", "invoice")
    .order("uploaded_at", { ascending: false })
  if (error) throw error
  return (data as ProjectDocumentRow[]).map(fromRow)
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120)
}

export async function uploadDocument(input: {
  projectId: string
  category: DocumentCategory
  file: File
  name?: string
  amount?: number | null
  notes?: string | null
  replacesId?: string | null
}): Promise<ProjectDocument> {
  const displayName = (input.name?.trim() || input.file.name).trim()
  const fileExt = input.file.name.includes(".")
    ? input.file.name.split(".").pop()
    : ""
  const stamped = `${Date.now()}_${safeFilename(input.file.name)}${
    fileExt && !input.file.name.endsWith(`.${fileExt}`) ? `.${fileExt}` : ""
  }`
  const path = `${input.projectId}/${input.category}/${stamped}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.file, {
      contentType: input.file.type || undefined,
      upsert: false,
    })
  if (uploadError) throw uploadError

  const { data: userRes } = await supabase.auth.getUser()
  const uploaderId = userRes.user?.id ?? null

  const { data, error } = await supabase
    .from("project_documents")
    .insert({
      project_id: input.projectId,
      category: input.category,
      name: displayName,
      storage_path: path,
      mime_type: input.file.type || null,
      size_bytes: input.file.size,
      amount: input.amount ?? null,
      notes: input.notes ?? null,
      replaces_id: input.replacesId ?? null,
      uploaded_by: uploaderId,
    })
    .select(COLUMNS)
    .single()
  if (error) {
    // best-effort cleanup of the orphaned object
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  return fromRow(data as ProjectDocumentRow)
}

export async function renameDocument(
  id: string,
  name: string
): Promise<ProjectDocument> {
  const { data, error } = await supabase
    .from("project_documents")
    .update({ name: name.trim() })
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as ProjectDocumentRow)
}

export async function updateDocumentMeta(
  id: string,
  patch: { amount?: number | null; notes?: string | null }
): Promise<ProjectDocument> {
  const dbPatch: Record<string, unknown> = {}
  if ("amount" in patch) dbPatch.amount = patch.amount
  if ("notes" in patch) dbPatch.notes = patch.notes
  const { data, error } = await supabase
    .from("project_documents")
    .update(dbPatch)
    .eq("id", id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return fromRow(data as ProjectDocumentRow)
}

export async function deleteDocument(doc: ProjectDocument): Promise<void> {
  await supabase.storage.from(BUCKET).remove([doc.storagePath])
  const { error } = await supabase
    .from("project_documents")
    .delete()
    .eq("id", doc.id)
  if (error) throw error
}

export async function getDocumentSignedUrl(
  doc: ProjectDocument,
  expiresInSeconds = 60 * 10
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.storagePath, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

export function formatBytes(n: number | null | undefined): string {
  if (!n || n <= 0) return "—"
  const units = ["B", "KB", "MB", "GB"]
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}
