"use client"

import * as React from "react"
import {
  CheckCircle2,
  ChevronDown,
  Image as ImageIcon,
  ListPlus,
  NotebookPen,
  Plus,
  Trash2,
  Video,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { NoteEditorDialog } from "@/components/project/note-editor"
import type { Phase } from "@/lib/phases-db"
import {
  deleteNote,
  listNotes,
  updateNote,
  type ProjectNote,
} from "@/lib/notes-db"
import {
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_ORDER,
  insertTask,
  type TaskPriority,
} from "@/lib/tasks-db"

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const DATE_FMT = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
})
const TIME_FMT = new Intl.DateTimeFormat("en", {
  hour: "numeric",
  minute: "2-digit",
})

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function shortTimestamp(iso: string): string {
  const d = new Date(iso)
  return isSameDay(d, new Date()) ? TIME_FMT.format(d) : DATE_FMT.format(d)
}

function relativeTime(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  const diffMins = Math.round(diffMs / 60_000)
  if (Math.abs(diffMins) < 60) return RELATIVE.format(diffMins, "minute")
  const diffHours = Math.round(diffMins / 60)
  if (Math.abs(diffHours) < 24) return RELATIVE.format(diffHours, "hour")
  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 7) return RELATIVE.format(diffDays, "day")
  return DATE_FMT.format(new Date(iso))
}

type MediaCounts = { images: number; looms: number }

function countMedia(note: ProjectNote): MediaCounts {
  const counts: MediaCounts = { images: 0, looms: 0 }
  const blocks = note.contentBlocks
  if (!Array.isArray(blocks)) return counts
  const walk = (block: unknown) => {
    if (!block || typeof block !== "object") return
    const b = block as { type?: string; children?: unknown[] }
    if (b.type === "image") counts.images++
    else if (b.type === "loom") counts.looms++
    if (Array.isArray(b.children)) b.children.forEach(walk)
  }
  blocks.forEach(walk)
  return counts
}

function firstLinePreview(note: ProjectNote): string {
  const text = note.content?.split("\n").find((l) => l.trim().length > 0) ?? ""
  return text.trim()
}

export function NotesInbox({
  projectId,
  phases,
  assignees,
}: {
  projectId: string
  phases: Phase[]
  assignees: string[]
}) {
  const [open, setOpen] = React.useState(false)
  const [notes, setNotes] = React.useState<ProjectNote[]>([])
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    listNotes(projectId)
      .then((data) => {
        if (!cancelled) {
          setNotes(data)
          setLoaded(true)
        }
      })
      .catch((e) => {
        console.error(e)
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [projectId])

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "n" && e.key !== "N") return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return
        }
      }
      e.preventDefault()
      setOpen((prev) => !prev)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const pending = notes.filter((n) => !n.convertedTaskId)
  const previewNote = pending[0] ?? notes[0] ?? null
  const previewText = previewNote ? firstLinePreview(previewNote) : ""

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="group flex w-full items-start gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <NotebookPen className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Notes inbox</span>
                {loaded && pending.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {pending.length}
                  </Badge>
                )}
                <kbd className="ml-auto hidden items-center justify-center rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-sm font-bold text-primary shadow-sm sm:inline-flex">
                  N
                </kbd>
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {previewNote ? (
                  <>
                    <span className="font-medium text-foreground/80 tabular-nums">
                      {shortTimestamp(previewNote.createdAt)}
                    </span>
                    <span className="mx-1.5 opacity-40">·</span>
                    {previewText || "(media note)"}
                  </>
                ) : (
                  "Click to jot ideas, drop images, paste Loom links — turn each into a task when ready."
                )}
              </p>
            </div>
            <Plus className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Notes inbox</DialogTitle>
          <DialogDescription>
            Type, paste images, drop a Loom link — convert any note into a task
            when you&apos;re ready.
          </DialogDescription>
        </DialogHeader>

        <NotesInboxBody
          projectId={projectId}
          phases={phases}
          assignees={assignees}
          notes={notes}
          setNotes={setNotes}
        />

        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" type="button">
                <X />
                Close
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NotesInboxBody({
  projectId,
  phases,
  assignees,
  notes,
  setNotes,
}: {
  projectId: string
  phases: Phase[]
  assignees: string[]
  notes: ProjectNote[]
  setNotes: React.Dispatch<React.SetStateAction<ProjectNote[]>>
}) {
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editingNote, setEditingNote] = React.useState<ProjectNote | null>(null)
  const [convertingId, setConvertingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  function openNewEditor() {
    setEditingNote(null)
    setEditorOpen(true)
  }

  function openEditor(note: ProjectNote) {
    setEditingNote(note)
    setEditorOpen(true)
  }

  function handleSaved(saved: ProjectNote) {
    setNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === saved.id)
      if (idx === -1) return [saved, ...prev]
      const next = prev.slice()
      next[idx] = saved
      return next
    })
  }

  async function handleDelete(id: string) {
    const snapshot = notes
    setNotes((prev) => prev.filter((n) => n.id !== id))
    try {
      await deleteNote(id)
    } catch (err) {
      setNotes(snapshot)
      setError(err instanceof Error ? err.message : "Failed to delete note")
    }
  }

  function handleEditorDeleted(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }

  async function handleConverted(noteId: string, taskId: string) {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, convertedTaskId: taskId } : n
      )
    )
    try {
      await updateNote(noteId, { convertedTaskId: taskId })
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {notes.length} note{notes.length === 1 ? "" : "s"} total
        </span>
        <Button type="button" size="sm" onClick={openNewEditor}>
          <Plus />
          New note
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="max-h-[50vh] overflow-y-auto rounded-md border bg-muted/20">
        {notes.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No notes yet — hit New note above.
          </p>
        ) : (
          <ul className="divide-y">
            {notes.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                onOpen={() => openEditor(note)}
                onDelete={() => handleDelete(note.id)}
                onConvert={() => setConvertingId(note.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <NoteEditorDialog
        projectId={projectId}
        note={editingNote}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={handleSaved}
        onDeleted={handleEditorDeleted}
      />

      {convertingId && (
        <ConvertToTaskDialog
          note={notes.find((n) => n.id === convertingId)!}
          phases={phases}
          assignees={assignees}
          projectId={projectId}
          onClose={() => setConvertingId(null)}
          onCreated={(taskId) => {
            handleConverted(convertingId, taskId)
            setConvertingId(null)
          }}
        />
      )}
    </div>
  )
}

function NoteRow({
  note,
  onOpen,
  onDelete,
  onConvert,
}: {
  note: ProjectNote
  onOpen: () => void
  onDelete: () => void
  onConvert: () => void
}) {
  const converted = !!note.convertedTaskId
  const preview = firstLinePreview(note)
  const media = countMedia(note)

  return (
    <li className="flex items-start gap-3 px-3 py-3">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col gap-1 text-left"
      >
        <p
          className={`line-clamp-2 text-sm ${
            converted ? "text-muted-foreground line-through" : ""
          }`}
        >
          {preview || (
            <span className="italic text-muted-foreground">
              {media.images || media.looms ? "(media-only note)" : "(empty)"}
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{relativeTime(note.createdAt)}</span>
          {media.images > 0 && (
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="size-3" />
              {media.images}
            </span>
          )}
          {media.looms > 0 && (
            <span className="inline-flex items-center gap-1 text-info">
              <Video className="size-3" />
              {media.looms}
            </span>
          )}
          {converted && (
            <Badge
              variant="outline"
              className="h-4 gap-1 px-1.5 text-[10px] text-success"
            >
              <CheckCircle2 className="size-3" />
              Task created
            </Badge>
          )}
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        {!converted && (
          <Button
            variant="outline"
            size="sm"
            onClick={onConvert}
            className="h-7 px-2 text-xs"
          >
            <ListPlus className="size-3.5" />
            Turn into task
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          aria-label="Delete note"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </li>
  )
}

function ConvertToTaskDialog({
  note,
  phases,
  assignees,
  projectId,
  onClose,
  onCreated,
}: {
  note: ProjectNote
  phases: Phase[]
  assignees: string[]
  projectId: string
  onClose: () => void
  onCreated: (taskId: string) => void
}) {
  const firstLine = note.content.split("\n")[0].trim()
  const rest = note.content.slice(firstLine.length).trim()

  const [title, setTitle] = React.useState(firstLine.slice(0, 120))
  const [description, setDescription] = React.useState(rest)
  const [phaseId, setPhaseId] = React.useState<string | null>(
    phases.find((p) => p.status === "in_progress")?.id ?? phases[0]?.id ?? null
  )
  const [priority, setPriority] = React.useState<TaskPriority>("medium")
  const [assignee, setAssignee] = React.useState<string>("")
  const [dueDate, setDueDate] = React.useState<string>("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const phaseLabel =
    phases.find((p) => p.id === phaseId)?.name ?? "No phase"

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      setError("Title is required")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const created = await insertTask({
        projectId,
        phaseId,
        title: trimmed,
        description: description.trim() || null,
        priority,
        assignee: assignee.trim() || null,
        dueDate: dueDate || null,
      })
      onCreated(created.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Turn note into task</DialogTitle>
          <DialogDescription>
            Adjust the details before creating the task.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Phase</Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-between font-normal"
                    >
                      {phaseLabel}
                      <ChevronDown className="size-3.5 opacity-60" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setPhaseId(null)}>
                    No phase
                  </DropdownMenuItem>
                  {phases.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => setPhaseId(p.id)}
                    >
                      {p.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-between font-normal"
                    >
                      {TASK_PRIORITY_LABEL[priority]}
                      <ChevronDown className="size-3.5 opacity-60" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start">
                  {TASK_PRIORITY_ORDER.map((p) => (
                    <DropdownMenuItem key={p} onClick={() => setPriority(p)}>
                      {TASK_PRIORITY_LABEL[p]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="task-assignee">Assignee</Label>
              <Input
                id="task-assignee"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Optional"
                list="note-task-assignees"
              />
              <datalist id="note-task-assignees">
                {assignees.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              <X />
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <ListPlus />
              {saving ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
