"use client"

import * as React from "react"
import {
  Download,
  FileText,
  History,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABEL,
  deleteDocument,
  formatBytes,
  getDocumentSignedUrl,
  listDocuments,
  renameDocument,
  updateDocumentMeta,
  uploadDocument,
  type DocumentCategory,
  type ProjectDocument,
} from "@/lib/documents-db"

const DATE_FMT = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

export function TabDocuments({ projectId }: { projectId: string }) {
  const [docs, setDocs] = React.useState<ProjectDocument[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState<DocumentCategory | "all">("all")

  React.useEffect(() => {
    let cancelled = false
    listDocuments(projectId)
      .then((d) => {
        if (!cancelled) {
          setDocs(d)
          setLoading(false)
        }
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  function onUploaded(doc: ProjectDocument) {
    setDocs((prev) => [doc, ...prev])
  }

  function onDeleted(id: string) {
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  function onUpdated(next: ProjectDocument) {
    setDocs((prev) => prev.map((d) => (d.id === next.id ? next : d)))
  }

  if (loading) return <Skeleton className="h-60 w-full" />

  const visible =
    filter === "all" ? docs : docs.filter((d) => d.category === filter)

  const grouped: Record<DocumentCategory, ProjectDocument[]> = {
    agreement: [],
    invoice: [],
    proposal: [],
    brief: [],
    other: [],
  }
  for (const d of visible) grouped[d.category].push(d)

  const counts: Record<DocumentCategory, number> = {
    agreement: 0,
    invoice: 0,
    proposal: 0,
    brief: 0,
    other: 0,
  }
  for (const d of docs) counts[d.category]++

  return (
    <div className="flex flex-col gap-6">
      <UploadDropZone projectId={projectId} onUploaded={onUploaded} />

      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="All"
          count={docs.length}
        />
        {DOCUMENT_CATEGORIES.map((cat) => (
          <FilterChip
            key={cat}
            active={filter === cat}
            onClick={() => setFilter(cat)}
            label={DOCUMENT_CATEGORY_LABEL[cat]}
            count={counts[cat]}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/40 p-10 text-center text-sm text-muted-foreground">
          No documents yet. Drag a file above or click to upload.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {DOCUMENT_CATEGORIES.map((cat) =>
            grouped[cat].length > 0 ? (
              <CategorySection
                key={cat}
                category={cat}
                docs={grouped[cat]}
                onDeleted={onDeleted}
                onUpdated={onUpdated}
              />
            ) : null
          )}
        </div>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border bg-background/40 text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
      <span
        className={`tabular-nums ${active ? "text-primary" : "opacity-60"}`}
      >
        {count}
      </span>
    </button>
  )
}

function CategorySection({
  category,
  docs,
  onDeleted,
  onUpdated,
}: {
  category: DocumentCategory
  docs: ProjectDocument[]
  onDeleted: (id: string) => void
  onUpdated: (doc: ProjectDocument) => void
}) {
  // For agreement, the first (newest) is "current"; the rest are versions.
  const isAgreement = category === "agreement"
  const current = docs[0]
  const older = docs.slice(1)
  const [showOlder, setShowOlder] = React.useState(false)

  return (
    <section className="rounded-2xl border bg-card">
      <header className="flex items-center justify-between border-b px-5 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {DOCUMENT_CATEGORY_LABEL[category]}
          {isAgreement && older.length > 0 ? (
            <span className="ml-2 normal-case tracking-normal text-[11px] text-muted-foreground">
              (current + {older.length} previous)
            </span>
          ) : null}
        </h2>
        {isAgreement && older.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setShowOlder((v) => !v)}
          >
            <History />
            {showOlder ? "Hide history" : "Show history"}
          </Button>
        )}
      </header>
      <ul className="divide-y">
        <DocumentRow doc={current} onDeleted={onDeleted} onUpdated={onUpdated} />
        {isAgreement && showOlder
          ? older.map((d) => (
              <DocumentRow
                key={d.id}
                doc={d}
                onDeleted={onDeleted}
                onUpdated={onUpdated}
                muted
              />
            ))
          : null}
        {!isAgreement &&
          docs
            .slice(1)
            .map((d) => (
              <DocumentRow
                key={d.id}
                doc={d}
                onDeleted={onDeleted}
                onUpdated={onUpdated}
              />
            ))}
      </ul>
    </section>
  )
}

function DocumentRow({
  doc,
  onDeleted,
  onUpdated,
  muted,
}: {
  doc: ProjectDocument
  onDeleted: (id: string) => void
  onUpdated: (doc: ProjectDocument) => void
  muted?: boolean
}) {
  const [downloading, setDownloading] = React.useState(false)
  const [editing, setEditing] = React.useState(false)

  async function handleDownload() {
    try {
      setDownloading(true)
      const url = await getDocumentSignedUrl(doc)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (e) {
      console.error(e)
    } finally {
      setDownloading(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    try {
      await deleteDocument(doc)
      onDeleted(doc.id)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : "Failed to delete")
    }
  }

  return (
    <li
      className={`flex flex-wrap items-center gap-3 px-5 py-3 ${
        muted ? "opacity-60" : ""
      }`}
    >
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col">
        <button
          type="button"
          onClick={handleDownload}
          className="truncate text-left text-sm font-medium hover:underline"
          title="Download"
        >
          {doc.name}
        </button>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span>{DATE_FMT.format(new Date(doc.uploadedAt))}</span>
          <span>{formatBytes(doc.sizeBytes)}</span>
          {doc.category === "invoice" && doc.amount != null && (
            <span className="font-medium text-foreground">
              ${doc.amount.toLocaleString()}
            </span>
          )}
          {doc.notes && (
            <span className="truncate italic">{doc.notes}</span>
          )}
        </div>
      </div>
      <Badge variant="outline" className="hidden sm:inline-flex">
        {DOCUMENT_CATEGORY_LABEL[doc.category]}
      </Badge>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleDownload}
        aria-label="Download"
        disabled={downloading}
      >
        {downloading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Download />
        )}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="More">
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <Pencil />
            Edit details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {editing && (
        <EditDocumentDialog
          doc={doc}
          onClose={() => setEditing(false)}
          onUpdated={(next) => {
            onUpdated(next)
            setEditing(false)
          }}
        />
      )}
    </li>
  )
}

function EditDocumentDialog({
  doc,
  onClose,
  onUpdated,
}: {
  doc: ProjectDocument
  onClose: () => void
  onUpdated: (doc: ProjectDocument) => void
}) {
  const [name, setName] = React.useState(doc.name)
  const [amount, setAmount] = React.useState(
    doc.amount != null ? String(doc.amount) : ""
  )
  const [notes, setNotes] = React.useState(doc.notes ?? "")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      let next = doc
      if (name.trim() !== doc.name) {
        next = await renameDocument(doc.id, name)
      }
      const nextAmount =
        amount.trim() === "" ? null : Number(amount)
      const nextNotes = notes.trim() === "" ? null : notes.trim()
      if (nextAmount !== doc.amount || nextNotes !== doc.notes) {
        next = await updateDocumentMeta(doc.id, {
          amount: nextAmount,
          notes: nextNotes,
        })
      }
      onUpdated(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
          <DialogDescription>
            Rename, set an amount (invoices), or add a note.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="doc-name">Name</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          {doc.category === "invoice" && (
            <div className="grid gap-2">
              <Label htmlFor="doc-amount">Amount</Label>
              <Input
                id="doc-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="doc-notes">Notes</Label>
            <Textarea
              id="doc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" type="button">
                  <X />
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Upload drop zone (also used as a button)
// ─────────────────────────────────────────────────────────────────────

function UploadDropZone({
  projectId,
  onUploaded,
}: {
  projectId: string
  onUploaded: (doc: ProjectDocument) => void
}) {
  const [dragOver, setDragOver] = React.useState(false)
  const [pending, setPending] = React.useState<File | null>(null)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setPending(files[0])
  }

  return (
    <>
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-card/40 hover:bg-muted/40"
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
      >
        <Upload className="size-5 text-muted-foreground" />
        <div className="text-sm font-medium">
          Drop a file here, or click to browse
        </div>
        <div className="text-xs text-muted-foreground">
          PDF, image, or doc up to 50 MB
        </div>
        <input
          type="file"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {pending && (
        <UploadDialog
          projectId={projectId}
          file={pending}
          onClose={() => setPending(null)}
          onUploaded={(d) => {
            onUploaded(d)
            setPending(null)
          }}
        />
      )}
    </>
  )
}

export function UploadDialog({
  projectId,
  file,
  defaultCategory,
  onClose,
  onUploaded,
}: {
  projectId: string
  file: File
  defaultCategory?: DocumentCategory
  onClose: () => void
  onUploaded: (doc: ProjectDocument) => void
}) {
  const [category, setCategory] = React.useState<DocumentCategory>(
    defaultCategory ?? "other"
  )
  const [name, setName] = React.useState(file.name)
  const [amount, setAmount] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUploading(true)
    setError(null)
    try {
      const doc = await uploadDocument({
        projectId,
        category,
        file,
        name: name.trim() || file.name,
        amount:
          category === "invoice" && amount.trim() !== ""
            ? Number(amount)
            : null,
        notes: notes.trim() || null,
      })
      onUploaded(doc)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !uploading && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            {formatBytes(file.size)} · {file.type || "unknown type"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-1.5">
              {DOCUMENT_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    category === c
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border bg-background/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {DOCUMENT_CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="up-name">Name</Label>
            <Input
              id="up-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {category === "invoice" && (
            <div className="grid gap-2">
              <Label htmlFor="up-amount">Amount</Label>
              <Input
                id="up-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="up-notes">Notes</Label>
            <Textarea
              id="up-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              disabled={uploading}
            >
              <X />
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Quick-upload button (used from the Dashboard tab)
// ─────────────────────────────────────────────────────────────────────

export function QuickUploadButton({
  projectId,
  category,
  label,
  variant = "outline",
  size = "sm",
  onUploaded,
}: {
  projectId: string
  category: DocumentCategory
  label: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  onUploaded?: (doc: ProjectDocument) => void
}) {
  const [pending, setPending] = React.useState<File | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => inputRef.current?.click()}
      >
        <Upload />
        {label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) setPending(f)
          e.target.value = ""
        }}
      />
      {pending && (
        <UploadDialog
          projectId={projectId}
          file={pending}
          defaultCategory={category}
          onClose={() => setPending(null)}
          onUploaded={(d) => {
            setPending(null)
            onUploaded?.(d)
          }}
        />
      )}
    </>
  )
}
