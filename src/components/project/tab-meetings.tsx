"use client"

import * as React from "react"
import {
  Calendar,
  CalendarPlus,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  Link as LinkIcon,
  ListChecks,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Video,
  X,
} from "lucide-react"

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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  deleteMeeting,
  insertMeeting,
  listMeetings,
  updateMeeting,
  type Meeting,
} from "@/lib/meetings-db"
import {
  deleteMeetingChecklistItem,
  insertMeetingChecklistItem,
  listMeetingChecklistItems,
  updateMeetingChecklistItem,
  type MeetingChecklistItem,
} from "@/lib/meeting-checklist-db"
import { cn } from "@/lib/utils"

const DAY_MS = 86_400_000

const DEFAULT_CHECKLIST = [
  "Send agenda to attendees",
  "Confirm meeting link works",
  "Recording / Fathom ready",
  "Demo loaded & screen tidy",
]

export function TabMeetings({ projectId }: { projectId: string }) {
  const [meetings, setMeetings] = React.useState<Meeting[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  React.useEffect(() => {
    listMeetings(projectId).then((m) => {
      setMeetings(m)
      setSelectedId(m[0]?.id ?? null)
      setLoading(false)
    })
  }, [projectId])

  const selected = meetings.find((m) => m.id === selectedId) ?? null

  function patchLocal(id: string, patch: Partial<Meeting>) {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  async function handleSchedule(input: {
    title: string
    scheduledAt: string | null
    meetingUrl: string | null
    fathomUrl: string | null
  }) {
    const created = await insertMeeting({
      projectId,
      title: input.title,
      scheduledAt: input.scheduledAt,
      meetingUrl: input.meetingUrl,
      fathomUrl: input.fathomUrl,
    })
    // Seed a starter checklist so the panel doesn't look empty.
    await Promise.all(
      DEFAULT_CHECKLIST.map((title, i) =>
        insertMeetingChecklistItem({ meetingId: created.id, title, position: i })
      )
    )
    setMeetings((prev) =>
      [created, ...prev].sort(sortMeetings)
    )
    setSelectedId(created.id)
    setDialogOpen(false)
  }

  async function handleDelete(id: string) {
    await deleteMeeting(id)
    setMeetings((prev) => {
      const next = prev.filter((m) => m.id !== id)
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? null)
      }
      return next
    })
  }

  async function handlePatch(
    id: string,
    patch: Partial<
      Pick<Meeting, "title" | "scheduledAt" | "meetingUrl" | "fathomUrl" | "notes">
    >
  ) {
    // Optimistic update
    patchLocal(id, patch)
    const updated = await updateMeeting(id, patch)
    setMeetings((prev) =>
      prev.map((m) => (m.id === id ? updated : m)).sort(sortMeetings)
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  const now = new Date()
  const upcoming = meetings.filter((m) => isUpcoming(m, now))
  const past = meetings.filter((m) => !isUpcoming(m, now))

  return (
    <div className="flex flex-col gap-5">
      <Header
        upcomingCount={upcoming.length}
        onSchedule={() => setDialogOpen(true)}
      />

      {meetings.length === 0 ? (
        <EmptyState onSchedule={() => setDialogOpen(true)} />
      ) : (
        <div className="flex min-h-0 flex-col gap-4">
          <MeetingPicker
            upcoming={upcoming}
            past={past}
            selected={selected}
            onSelect={setSelectedId}
          />
          {selected ? (
            <MeetingDetail
              key={selected.id}
              meeting={selected}
              onPatch={(patch) => handlePatch(selected.id, patch)}
              onDelete={() => handleDelete(selected.id)}
            />
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dashed bg-card/30 p-10 text-sm text-muted-foreground">
              Pick a meeting from the dropdown above.
            </div>
          )}
        </div>
      )}

      <ScheduleMeetingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSchedule}
      />
    </div>
  )
}

// ─── Header ────────────────────────────────────────────────────────────────

function Header({
  upcomingCount,
  onSchedule,
}: {
  upcomingCount: number
  onSchedule: () => void
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Video className="size-4" />
          </span>
          Meetings
          {upcomingCount > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              · {upcomingCount} upcoming
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule the call, run the pre-meeting checklist, drop the Fathom
          link when you&apos;re done.
        </p>
      </div>
      <Button onClick={onSchedule}>
        <CalendarPlus />
        Schedule meeting
      </Button>
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────

function EmptyState({ onSchedule }: { onSchedule: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/30 p-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Video className="size-6" />
      </span>
      <div>
        <h2 className="text-base font-semibold">No meetings yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Schedule a call to plan it, run a pre-meeting checklist, and keep the
          recording link in one place.
        </p>
      </div>
      <Button onClick={onSchedule} className="mt-2">
        <CalendarPlus />
        Schedule your first meeting
      </Button>
    </div>
  )
}

// ─── Meeting picker (dropdown) ─────────────────────────────────────────────

function MeetingPicker({
  upcoming,
  past,
  selected,
  onSelect,
}: {
  upcoming: Meeting[]
  past: Meeting[]
  selected: Meeting | null
  onSelect: (id: string) => void
}) {
  const now = new Date()
  const selectedDate = selected ? parseDate(selected.scheduledAt) : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="group flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Video className="size-4" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold">
                  {selected?.title || "Pick a meeting"}
                </span>
                <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                  {selectedDate ? (
                    <>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDateShort(selectedDate)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatTime(selectedDate)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-px text-[10px]",
                          isUpcomingDate(selectedDate, now)
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {formatRelative(selectedDate, now)}
                      </span>
                    </>
                  ) : selected ? (
                    <span className="italic">unscheduled</span>
                  ) : (
                    <span>
                      {upcoming.length} upcoming · {past.length} past
                    </span>
                  )}
                </span>
              </div>
            </div>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </button>
        }
      />
      <DropdownMenuContent
        align="start"
        className="max-h-[60vh] min-w-[320px] overflow-y-auto"
      >
        <PickerGroup
          label="Upcoming"
          meetings={upcoming}
          selectedId={selected?.id ?? null}
          onSelect={onSelect}
          emptyHint="Nothing scheduled."
        />
        {past.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <PickerGroup
              label="Past"
              meetings={past}
              selectedId={selected?.id ?? null}
              onSelect={onSelect}
              muted
            />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PickerGroup({
  label,
  meetings,
  selectedId,
  onSelect,
  emptyHint,
  muted,
}: {
  label: string
  meetings: Meeting[]
  selectedId: string | null
  onSelect: (id: string) => void
  emptyHint?: string
  muted?: boolean
}) {
  const now = new Date()
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span>{label}</span>
        <span>{meetings.length}</span>
      </DropdownMenuLabel>
      {meetings.length === 0 && emptyHint ? (
        <p className="px-2 pb-2 text-xs italic text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        meetings.map((m) => {
          const date = parseDate(m.scheduledAt)
          const selected = selectedId === m.id
          return (
            <DropdownMenuItem
              key={m.id}
              onClick={() => onSelect(m.id)}
              className={cn(
                "flex flex-col items-start gap-1",
                selected && "bg-primary/10",
                muted && !selected && "opacity-75"
              )}
            >
              <div className="flex w-full items-center gap-2">
                <span
                  className={cn(
                    "flex-1 truncate text-sm font-medium",
                    selected && "text-primary"
                  )}
                >
                  {m.title || "Untitled meeting"}
                </span>
                {selected && (
                  <Check className="size-3.5 shrink-0 text-primary" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                {date ? (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatDateShort(date)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatTime(date)}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-px text-[10px]",
                        isUpcomingDate(date, now)
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {formatRelative(date, now)}
                    </span>
                  </>
                ) : (
                  <span className="italic">unscheduled</span>
                )}
                {m.fathomUrl && (
                  <span className="inline-flex items-center gap-1 text-info">
                    <Video className="size-3" />
                    Fathom
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          )
        })
      )}
    </DropdownMenuGroup>
  )
}

// ─── Right column: meeting detail ──────────────────────────────────────────

function MeetingDetail({
  meeting,
  onPatch,
  onDelete,
}: {
  meeting: Meeting
  onPatch: (
    patch: Partial<
      Pick<Meeting, "title" | "scheduledAt" | "meetingUrl" | "fathomUrl" | "notes">
    >
  ) => void
  onDelete: () => void
}) {
  const date = parseDate(meeting.scheduledAt)
  const now = new Date()
  return (
    <div className="flex flex-col gap-4">
      <DetailHeader
        meeting={meeting}
        date={date}
        now={now}
        onPatch={onPatch}
        onDelete={onDelete}
      />

      <Band icon={<Calendar className="size-3.5" />} title="Schedule">
        <DateEditableRow
          label="Date"
          value={date}
          part="date"
          onSave={(next) => onPatch({ scheduledAt: next })}
          existing={meeting.scheduledAt}
        />
        <DateEditableRow
          label="Time"
          value={date}
          part="time"
          onSave={(next) => onPatch({ scheduledAt: next })}
          existing={meeting.scheduledAt}
        />
        <UrlEditableRow
          label="Meeting link"
          icon={<LinkIcon className="size-3.5" />}
          value={meeting.meetingUrl}
          onSave={(v) => onPatch({ meetingUrl: v })}
          placeholder="https://zoom.us/j/…"
          emptyHint="Add the Zoom / Meet / Teams link"
        />
        <UrlEditableRow
          label="Fathom recording"
          icon={<Video className="size-3.5" />}
          value={meeting.fathomUrl}
          onSave={(v) => onPatch({ fathomUrl: v })}
          placeholder="https://fathom.video/share/…"
          emptyHint="Paste this after the call"
          last
        />
      </Band>

      <Band
        icon={<ListChecks className="size-3.5" />}
        title="Pre-meeting checklist"
      >
        <ChecklistPanel meetingId={meeting.id} />
      </Band>

      <Band title="Notes">
        <NotesField
          value={meeting.notes ?? ""}
          onSave={(notes) => onPatch({ notes })}
        />
      </Band>
    </div>
  )
}

function DetailHeader({
  meeting,
  date,
  now,
  onPatch,
  onDelete,
}: {
  meeting: Meeting
  date: Date | null
  now: Date
  onPatch: (patch: Partial<Pick<Meeting, "title">>) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(meeting.title)

  function startEdit() {
    setDraft(meeting.title)
    setEditing(true)
  }

  function save() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === meeting.title) {
      setEditing(false)
      return
    }
    onPatch({ title: trimmed })
    setEditing(false)
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  save()
                } else if (e.key === "Escape") {
                  setEditing(false)
                }
              }}
              className="h-9 text-base font-semibold"
            />
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="group flex items-center gap-2 text-left text-base font-semibold leading-tight hover:text-foreground"
            >
              <span className="truncate">{meeting.title}</span>
              <Pencil className="size-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
            </button>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {date ? (
              <>
                <span className="text-foreground">{formatDateLong(date)}</span>
                <span>·</span>
                <span className="text-foreground">{formatTime(date)}</span>
                <RelativeChip date={date} now={now} />
              </>
            ) : (
              <span className="italic">No date set yet</span>
            )}
          </div>
        </div>
        <DeleteMeetingButton onConfirm={onDelete} />
      </div>
    </div>
  )
}

function RelativeChip({ date, now }: { date: Date; now: Date }) {
  const upcoming = isUpcomingDate(date, now)
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        upcoming
          ? "bg-primary/15 text-primary"
          : "bg-muted text-muted-foreground"
      )}
    >
      {formatRelative(date, now)}
    </span>
  )
}

function DeleteMeetingButton({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete meeting"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete meeting?</DialogTitle>
          <DialogDescription>
            This removes the meeting and its pre-meeting checklist. You
            can&apos;t undo this.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              setOpen(false)
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Band container (named-group rows) ─────────────────────────────────────

function Band({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <header className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </h2>
      </header>
      <div className="flex flex-col">{children}</div>
    </section>
  )
}

// ─── Editable rows ─────────────────────────────────────────────────────────

function Row({
  label,
  children,
  last,
}: {
  label: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-4 px-4 py-2.5 sm:grid-cols-[150px_1fr]",
        !last && "border-b border-border/60"
      )}
    >
      <span className="text-[12px] font-medium text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function DateEditableRow({
  label,
  value,
  part,
  existing,
  onSave,
}: {
  label: string
  value: Date | null
  part: "date" | "time"
  existing: string | null
  onSave: (next: string | null) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const currentInitial = value
    ? part === "date"
      ? ymd(value)
      : hm(value)
    : ""
  const [draft, setDraft] = React.useState(currentInitial)

  function startEdit() {
    setDraft(currentInitial)
    setEditing(true)
  }

  function save() {
    if (!draft) {
      // If they cleared it, clear the whole scheduled_at (we can't have a
      // half-set datetime).
      onSave(null)
      setEditing(false)
      return
    }
    const base = value ?? new Date()
    let next: Date
    if (part === "date") {
      const [y, m, d] = draft.split("-").map(Number)
      next = new Date(base)
      next.setFullYear(y, (m ?? 1) - 1, d ?? 1)
    } else {
      const [h, min] = draft.split(":").map(Number)
      next = new Date(base)
      next.setHours(h ?? 0, min ?? 0, 0, 0)
    }
    onSave(next.toISOString())
    setEditing(false)
  }

  return (
    <Row label={label}>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            type={part === "date" ? "date" : "time"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-8 w-fit max-w-44"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                save()
              } else if (e.key === "Escape") {
                setEditing(false)
              }
            }}
          />
          <Button size="sm" onClick={save} className="h-8">
            <Check />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            className="h-8"
          >
            <X />
          </Button>
        </div>
      ) : value ? (
        <button
          type="button"
          onClick={startEdit}
          className="group inline-flex items-center gap-2 text-sm text-foreground hover:text-foreground"
        >
          <span>{part === "date" ? formatDateLong(value) : formatTime(value)}</span>
          <Pencil className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
        </button>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" />
          Add {label.toLowerCase()}
        </button>
      )}
      {!existing && part === "time" && value === null && null}
    </Row>
  )
}

function UrlEditableRow({
  label,
  icon,
  value,
  onSave,
  placeholder,
  emptyHint,
  last,
}: {
  label: string
  icon?: React.ReactNode
  value: string | null
  onSave: (next: string | null) => void
  placeholder?: string
  emptyHint?: string
  last?: boolean
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value ?? "")

  function startEdit() {
    setDraft(value ?? "")
    setEditing(true)
  }

  function save() {
    const trimmed = draft.trim()
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      onSave(`https://${trimmed}`)
    } else {
      onSave(trimmed || null)
    }
    setEditing(false)
  }

  return (
    <Row label={label} last={last}>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                save()
              } else if (e.key === "Escape") {
                setEditing(false)
              }
            }}
            className="h-8 max-w-md"
          />
          <Button size="sm" onClick={save} className="h-8">
            <Check />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            className="h-8"
          >
            <X />
          </Button>
        </div>
      ) : value ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md border border-info/25 bg-info/10 px-2 py-1 text-xs font-medium text-info hover:bg-info/15"
          >
            {icon}
            <span className="truncate">{value}</span>
            <ExternalLink className="size-3 shrink-0" />
          </a>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={startEdit}
            aria-label={`Edit ${label}`}
          >
            <Pencil className="size-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" />
          {emptyHint ?? `Add ${label.toLowerCase()}`}
        </button>
      )}
    </Row>
  )
}

// ─── Checklist ─────────────────────────────────────────────────────────────

function ChecklistPanel({ meetingId }: { meetingId: string }) {
  const [items, setItems] = React.useState<MeetingChecklistItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [draft, setDraft] = React.useState("")

  React.useEffect(() => {
    listMeetingChecklistItems(meetingId).then((rs) => {
      setItems(rs)
      setLoading(false)
    })
  }, [meetingId])

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!draft.trim()) return
    const created = await insertMeetingChecklistItem({
      meetingId,
      title: draft,
      position: items.length,
    })
    setItems((prev) => [...prev, created])
    setDraft("")
  }

  async function toggle(item: MeetingChecklistItem) {
    const updated = await updateMeetingChecklistItem(item.id, { done: !item.done })
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
  }

  async function remove(id: string) {
    await deleteMeetingChecklistItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  async function resetAll() {
    const completed = items.filter((i) => i.done)
    await Promise.all(
      completed.map((i) => updateMeetingChecklistItem(i.id, { done: false }))
    )
    setItems((prev) => prev.map((i) => ({ ...i, done: false })))
  }

  if (loading) {
    return (
      <div className="px-4 py-4">
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const completed = items.filter((i) => i.done).length
  const total = items.length
  const pct = total ? Math.round((completed / total) * 100) : 0

  return (
    <div className="flex flex-col">
      {total > 0 && (
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct === 100 ? "bg-success" : "bg-primary"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {completed}/{total}
          </span>
          {completed > 0 && (
            <Button variant="ghost" size="sm" onClick={resetAll} className="h-7">
              <RotateCcw />
              Reset
            </Button>
          )}
        </div>
      )}

      {total === 0 ? (
        <p className="px-4 py-3 text-xs text-muted-foreground">
          No items yet — add a few below.
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.map((i, idx) => (
            <li
              key={i.id}
              className={cn(
                "group flex items-center gap-3 px-4 py-2 transition-colors",
                idx !== items.length - 1 && "border-b border-border/40",
                i.done && "bg-muted/30"
              )}
            >
              <CheckBox checked={i.done} onChange={() => toggle(i)} />
              <span
                className={cn(
                  "flex-1 text-sm",
                  i.done && "text-muted-foreground line-through"
                )}
              >
                {i.title}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100"
                aria-label={`Delete ${i.title}`}
                onClick={() => remove(i.id)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="flex gap-2 border-t border-border/60 px-4 py-3">
        <Input
          value={draft}
          placeholder="Add a checklist item…"
          onChange={(e) => setDraft(e.target.value)}
          className="h-8"
        />
        <Button type="submit" size="sm" className="h-8" disabled={!draft.trim()}>
          <Plus />
          Add
        </Button>
      </form>
    </div>
  )
}

function CheckBox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      role="checkbox"
      aria-checked={checked}
      className={cn(
        "flex size-[18px] shrink-0 items-center justify-center rounded-md border transition-colors",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:border-foreground/40"
      )}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  )
}

// ─── Notes ─────────────────────────────────────────────────────────────────

function NotesField({
  value,
  onSave,
}: {
  value: string
  onSave: (next: string | null) => void
}) {
  const [draft, setDraft] = React.useState(value)
  const [dirty, setDirty] = React.useState(false)

  function flush() {
    if (!dirty) return
    const trimmed = draft.trim()
    if (trimmed === value) {
      setDirty(false)
      return
    }
    onSave(trimmed || null)
    setDraft(trimmed)
    setDirty(false)
  }

  return (
    <div className="px-4 py-3">
      <Textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          setDirty(true)
        }}
        onBlur={flush}
        rows={4}
        placeholder="Agenda, prep notes, key talking points…"
        className="resize-y border-border/60 focus-visible:border-border"
      />
      {dirty && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Unsaved — click outside the box to save.
        </p>
      )}
    </div>
  )
}

// ─── Schedule dialog ───────────────────────────────────────────────────────

function ScheduleMeetingDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  onSubmit: (input: {
    title: string
    scheduledAt: string | null
    meetingUrl: string | null
    fathomUrl: string | null
  }) => Promise<void>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && <ScheduleMeetingForm onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  )
}

function ScheduleMeetingForm({
  onSubmit,
}: {
  onSubmit: (input: {
    title: string
    scheduledAt: string | null
    meetingUrl: string | null
    fathomUrl: string | null
  }) => Promise<void>
}) {
  const [title, setTitle] = React.useState("")
  const [date, setDate] = React.useState("")
  const [time, setTime] = React.useState("")
  const [meetingUrl, setMeetingUrl] = React.useState("")
  const [fathomUrl, setFathomUrl] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim()) return
    let scheduledAt: string | null = null
    if (date && time) {
      const [y, m, d] = date.split("-").map(Number)
      const [h, min] = time.split(":").map(Number)
      const dt = new Date()
      dt.setFullYear(y, (m ?? 1) - 1, d ?? 1)
      dt.setHours(h ?? 0, min ?? 0, 0, 0)
      scheduledAt = dt.toISOString()
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        scheduledAt,
        meetingUrl: normalizeUrl(meetingUrl),
        fathomUrl: normalizeUrl(fathomUrl),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule")
      setSubmitting(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Schedule meeting</DialogTitle>
        <DialogDescription>
          Set the date, time, and link. You can add the Fathom recording
          after the call.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="m-title">Title</Label>
            <Input
              id="m-title"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kickoff call · Acme"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="m-date">Date</Label>
              <Input
                id="m-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-time">Time</Label>
              <Input
                id="m-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="m-link">
              Meeting link{" "}
              <span className="text-xs font-normal text-muted-foreground">
                · optional
              </span>
            </Label>
            <Input
              id="m-link"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/j/…"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="m-fathom">
              Fathom link{" "}
              <span className="text-xs font-normal text-muted-foreground">
                · optional, paste after the call
              </span>
            </Label>
            <Input
              id="m-fathom"
              value={fathomUrl}
              onChange={(e) => setFathomUrl(e.target.value)}
              placeholder="https://fathom.video/share/…"
            />
          </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            Cancel
          </DialogClose>
          <Button type="submit" disabled={submitting || !title.trim()}>
            {submitting ? "Scheduling…" : "Schedule meeting"}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function isUpcoming(m: Meeting, now: Date): boolean {
  const d = parseDate(m.scheduledAt)
  if (!d) return true
  return d.getTime() >= now.getTime() - 60 * 60 * 1000 // 1h grace
}

function isUpcomingDate(d: Date, now: Date): boolean {
  return d.getTime() >= now.getTime() - 60 * 60 * 1000
}

function sortMeetings(a: Meeting, b: Meeting): number {
  const da = parseDate(a.scheduledAt)?.getTime() ?? Number.POSITIVE_INFINITY
  const db = parseDate(b.scheduledAt)?.getTime() ?? Number.POSITIVE_INFINITY
  // Upcoming first (ascending), then past most-recent first (descending).
  const now = Date.now()
  const aFuture = da >= now
  const bFuture = db >= now
  if (aFuture && !bFuture) return -1
  if (!aFuture && bFuture) return 1
  if (aFuture && bFuture) return da - db
  return db - da
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function hm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function formatDateLong(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatRelative(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / DAY_MS)
  if (Math.abs(diffMs) < 60 * 60 * 1000) {
    const mins = Math.round(diffMs / 60000)
    if (mins === 0) return "now"
    if (mins > 0) return `in ${mins} min`
    return `${Math.abs(mins)} min ago`
  }
  if (diffDays === 0) {
    const hrs = Math.round(diffMs / (60 * 60 * 1000))
    if (hrs === 0) return "today"
    if (hrs > 0) return `in ${hrs}h`
    return `${Math.abs(hrs)}h ago`
  }
  if (diffDays === 1) return "tomorrow"
  if (diffDays === -1) return "yesterday"
  if (diffDays > 0) {
    if (diffDays < 7) return `in ${diffDays} days`
    if (diffDays < 30) return `in ${Math.round(diffDays / 7)} weeks`
    return `in ${Math.round(diffDays / 30)} months`
  }
  const abs = Math.abs(diffDays)
  if (abs < 7) return `${abs} days ago`
  if (abs < 30) return `${Math.round(abs / 7)} weeks ago`
  return `${Math.round(abs / 30)} months ago`
}

function normalizeUrl(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

