"use client"

import * as React from "react"
import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  createTaskAttachment,
  deleteTaskAttachment,
  listTaskAttachments,
  uploadTaskFile,
  type TaskAttachment,
  type TaskAttachmentKind,
} from "@/lib/task-attachments-db"

const LOOM_RE = /loom\.com|youtube\.com|youtu\.be|vimeo\.com|wistia\.com/i
const IMG_RE = /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i

type DisplayKind = "video" | "image" | "doc" | "link"

function detect(url: string): DisplayKind {
  if (LOOM_RE.test(url)) return "video"
  if (IMG_RE.test(url)) return "image"
  if (/\.pdf(\?|$)|figma\.com|notion\.so|docs\.google\.com|drive\.google\.com/i.test(url)) {
    return "doc"
  }
  return "link"
}

function iconFor(kind: DisplayKind) {
  if (kind === "video") return Video
  if (kind === "image") return ImageIcon
  if (kind === "doc") return FileText
  return LinkIcon
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function TaskAttachments({ taskId }: { taskId: string }) {
  const [items, setItems] = React.useState<TaskAttachment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [adding, setAdding] = React.useState(false)
  const [url, setUrl] = React.useState("")
  const [label, setLabel] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [uploadingName, setUploadingName] = React.useState<string | null>(null)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    let cancelled = false
    listTaskAttachments(taskId).then((rows) => {
      if (cancelled) return
      setItems(rows)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [taskId])

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      const kind: TaskAttachmentKind = LOOM_RE.test(trimmed)
        ? "briefing_loom"
        : "briefing_doc"
      const created = await createTaskAttachment({
        taskId,
        kind,
        url: trimmed,
        label: label.trim() || null,
        position: items.length,
      })
      setItems((prev) => [...prev, created])
      setUrl("")
      setLabel("")
      setAdding(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadError(null)
    for (const file of Array.from(files)) {
      setUploadingName(file.name)
      try {
        const publicUrl = await uploadTaskFile(taskId, file)
        const kind: TaskAttachmentKind = file.type.startsWith("video/")
          ? "briefing_loom"
          : "briefing_doc"
        const created = await createTaskAttachment({
          taskId,
          kind,
          url: publicUrl,
          label: file.name,
          position: items.length,
        })
        setItems((prev) => [...prev, created])
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed"
        setUploadError(msg)
        break
      }
    }
    setUploadingName(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((a) => a.id !== id))
    await deleteTaskAttachment(id)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Links &amp; materials
          </h3>
          {items.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-px text-[10px] tabular-nums text-muted-foreground">
              {items.length}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="xs"
          type="button"
          onClick={() => setAdding((s) => !s)}
        >
          {adding ? (
            <>
              <X />
              Cancel
            </>
          ) : (
            <>
              <Plus />
              Add
            </>
          )}
        </Button>
      </div>

      {adding && (
        <div className="flex flex-col gap-3 rounded-md border border-dashed bg-muted/20 p-3">
          <form onSubmit={handleAdd} className="flex flex-col gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste any link (Loom, Figma, PDF, image…)"
              type="url"
              autoFocus
            />
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (optional)"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="xs"
                disabled={!url.trim() || submitting}
              >
                {submitting ? "Adding…" : "Add link"}
              </Button>
            </div>
          </form>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <label className="group/upload flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed bg-background/40 px-4 py-5 text-center transition-colors hover:bg-background/70">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="sr-only"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={uploadingName !== null}
            />
            <Upload className="size-5 text-muted-foreground transition-colors group-hover/upload:text-foreground" />
            <span className="text-sm font-medium">
              {uploadingName ? `Uploading ${uploadingName}…` : "Upload a file"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              PDFs, images, docs &mdash; up to 50&nbsp;MB
            </span>
          </label>

          {uploadError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {uploadError}
            </p>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : items.length === 0 && !adding ? (
        <div className="rounded-md border border-dashed bg-card/40 px-3 py-4 text-center text-xs text-muted-foreground">
          No materials yet. Drop a link to a Loom, Figma, PDF, image — anything.
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((a) => {
            const kind = detect(a.url)
            const Icon = iconFor(kind)
            return (
              <li
                key={a.id}
                className="group flex items-center gap-3 rounded-md border bg-card px-3 py-2 transition-colors hover:bg-card/80"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {a.label || hostFromUrl(a.url)}
                  </a>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {a.url}
                  </span>
                </div>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                  aria-label="Open"
                >
                  <ExternalLink className="size-3.5" />
                </a>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Remove"
                  onClick={() => handleDelete(a.id)}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
