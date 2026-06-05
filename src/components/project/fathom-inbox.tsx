"use client"

import * as React from "react"
import {
  ExternalLink,
  Link as LinkIcon,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  deleteFathomTranscript,
  insertFathomTranscript,
  listFathomTranscripts,
  type FathomTranscript,
} from "@/lib/fathom-db"

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

function normalizeUrl(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

function previewLine(text: string): string {
  const firstLine = text.split("\n").find((l) => l.trim().length > 0) ?? ""
  return firstLine.trim()
}

export function FathomInbox({ projectId }: { projectId: string }) {
  const [open, setOpen] = React.useState(false)
  const [entries, setEntries] = React.useState<FathomTranscript[]>([])
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    listFathomTranscripts(projectId)
      .then((data) => {
        if (!cancelled) {
          setEntries(data)
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
      if (e.key !== "f" && e.key !== "F") return
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

  const latest = entries[0] ?? null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="group flex w-full items-start gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Video className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Fathom transcripts</span>
                {loaded && entries.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {entries.length}
                  </Badge>
                )}
                <kbd className="ml-auto hidden items-center justify-center rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-sm font-bold text-primary shadow-sm sm:inline-flex">
                  F
                </kbd>
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {latest ? (
                  <>
                    <span className="font-medium text-foreground/80 tabular-nums">
                      {shortTimestamp(latest.createdAt)}
                    </span>
                    <span className="mx-1.5 opacity-40">·</span>
                    {previewLine(latest.transcript) || "(empty line)"}
                  </>
                ) : (
                  "Paste a Fathom transcript after each call — we'll keep them here."
                )}
              </p>
            </div>
            <Plus className="mt-1 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
          </button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fathom transcripts</DialogTitle>
          <DialogDescription>
            Paste the transcript from Fathom — optionally drop in the share URL
            too. Stored for the whole project.
          </DialogDescription>
        </DialogHeader>

        <FathomInboxBody
          projectId={projectId}
          entries={entries}
          setEntries={setEntries}
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

function FathomInboxBody({
  projectId,
  entries,
  setEntries,
}: {
  projectId: string
  entries: FathomTranscript[]
  setEntries: React.Dispatch<React.SetStateAction<FathomTranscript[]>>
}) {
  const [transcript, setTranscript] = React.useState("")
  const [fathomUrl, setFathomUrl] = React.useState("")
  const [adding, setAdding] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const transcriptRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    // Auto-focus the paste target when the dialog opens.
    transcriptRef.current?.focus()
  }, [])

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const content = transcript.trim()
    if (!content) return
    setAdding(true)
    setError(null)
    try {
      const created = await insertFathomTranscript({
        projectId,
        transcript: content,
        fathomUrl: normalizeUrl(fathomUrl),
      })
      setEntries((prev) => [created, ...prev])
      setTranscript("")
      setFathomUrl("")
      transcriptRef.current?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save transcript")
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    const snapshot = entries
    setEntries((prev) => prev.filter((e) => e.id !== id))
    try {
      await deleteFathomTranscript(id)
    } catch (err) {
      setEntries(snapshot)
      setError(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAdd} className="flex flex-col gap-2">
        <Label htmlFor="fathom-transcript" className="sr-only">
          Transcript
        </Label>
        <Textarea
          id="fathom-transcript"
          ref={transcriptRef}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste the Fathom transcript here…"
          rows={6}
          disabled={adding}
          className="font-mono text-xs"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <LinkIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="fathom-url"
              value={fathomUrl}
              onChange={(e) => setFathomUrl(e.target.value)}
              placeholder="Fathom share URL (optional)"
              disabled={adding}
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Button type="submit" size="sm" disabled={!transcript.trim() || adding}>
            <Plus />
            {adding ? "Saving…" : "Save"}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {entries.length} transcript{entries.length === 1 ? "" : "s"} stored
          </span>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>

      <div className="max-h-[50vh] overflow-y-auto rounded-md border bg-muted/20">
        {entries.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No transcripts yet. Paste one above.
          </p>
        ) : (
          <ul className="divide-y">
            {entries.map((entry) => (
              <TranscriptRow
                key={entry.id}
                entry={entry}
                onDelete={() => handleDelete(entry.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function TranscriptRow({
  entry,
  onDelete,
}: {
  entry: FathomTranscript
  onDelete: () => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  const isLong = entry.transcript.length > 240
  const preview = isLong
    ? `${entry.transcript.slice(0, 240).trimEnd()}…`
    : entry.transcript

  return (
    <li className="flex items-start gap-3 px-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {expanded ? entry.transcript : preview}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>{relativeTime(entry.createdAt)}</span>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-primary hover:underline"
            >
              {expanded ? "Show less" : "Show full transcript"}
            </button>
          )}
          {entry.fathomUrl && (
            <a
              href={entry.fathomUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-info hover:underline"
            >
              <ExternalLink className="size-3" />
              Fathom
            </a>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        aria-label="Delete transcript"
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  )
}
