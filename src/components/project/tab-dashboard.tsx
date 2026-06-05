"use client"

import * as React from "react"
import { ChevronDown, Pencil, Video, X } from "lucide-react"

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
import { ColoredAvatar } from "@/components/ui/colored-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusPill } from "@/components/ui/status-pill"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DashboardFinancialsSnapshot } from "@/components/project/dashboard-financials-snapshot"
import { DashboardTodayCard } from "@/components/project/dashboard-today-card"
import { FathomInbox } from "@/components/project/fathom-inbox"
import { NotesInbox } from "@/components/project/notes-inbox"
import { PhaseDetailDialog } from "@/components/project/phase-detail-dialog"
import { listMeetings, type Meeting } from "@/lib/meetings-db"
import type { Phase } from "@/lib/phases-db"
import {
  useProjects,
  type Project,
  type ProjectStage,
} from "@/lib/projects-context"
import { PROJECT_STAGE_TONE, TONE_CLASSES } from "@/lib/status-colors"

const STAGE_LABEL: Record<ProjectStage, string> = {
  demo: "Demo",
  in_progress: "In progress",
  archived: "Archived",
}

export function TabDashboard({
  project,
  assignees,
  phases,
}: {
  project: Project
  assignees: string[]
  phases: Phase[]
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ProjectInfoCard project={project} assignees={assignees} />
      <TimelineRail project={project} phases={phases} />
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <NotesInbox
          projectId={project.id}
          phases={phases}
          assignees={assignees}
        />
        <FathomInbox projectId={project.id} />
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <DashboardTodayCard projectId={project.id} />
        <DashboardFinancialsSnapshot projectId={project.id} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Project info card
// ─────────────────────────────────────────────────────────────────────

function ProjectInfoCard({
  project,
  assignees,
}: {
  project: Project
  assignees: string[]
}) {
  const { setName, setClientName, setDeveloperName, setStage } = useProjects()

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border bg-card px-5 py-4">
      <div className="flex min-w-0 flex-col items-start gap-2">
        <EditableHeading
          value={project.projectName}
          placeholder="Untitled project"
          onSave={(next) => setName(project.id, next)}
        />
        <div className="flex flex-col gap-0.5">
          <PersonRow
            label="Client"
            value={project.clientName}
            placeholder="Add client"
            onSave={(next) => setClientName(project.id, next ?? "")}
          />
          <PersonRow
            label="Developer"
            value={project.developerName}
            placeholder="Add developer"
            assignees={assignees}
            onSave={(next) => setDeveloperName(project.id, next)}
          />
        </div>
      </div>
      <StagePicker
        stage={project.stage}
        onChange={(next) => setStage(project.id, next)}
      />
    </div>
  )
}

function StagePicker({
  stage,
  onChange,
}: {
  stage: ProjectStage
  onChange: (next: ProjectStage) => Promise<void>
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        nativeButton={false}
        render={
          <StatusPill
            tone={PROJECT_STAGE_TONE[stage]}
            dot
            className="cursor-pointer"
          >
            {STAGE_LABEL[stage]}
            <ChevronDown className="size-3" />
          </StatusPill>
        }
      />
      <DropdownMenuContent align="start">
        {(Object.keys(STAGE_LABEL) as ProjectStage[]).map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => {
              if (s !== stage) void onChange(s)
            }}
            className="gap-2"
          >
            <span
              className={`size-2 rounded-full ${TONE_CLASSES[PROJECT_STAGE_TONE[s]].dot}`}
            />
            {STAGE_LABEL[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PersonRow({
  label,
  value,
  placeholder,
  assignees,
  onSave,
}: {
  label: string
  value: string | null
  placeholder: string
  assignees?: string[]
  onSave: (next: string | null) => Promise<void>
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value ?? "")
  const [saving, setSaving] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const datalistId = React.useId()

  React.useEffect(() => {
    setDraft(value ?? "")
  }, [value])

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  async function commit() {
    const next = draft.trim() || null
    if (next === (value ?? null)) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(next)
    } catch {
      setDraft(value ?? "")
    } finally {
      setEditing(false)
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 shrink-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </span>
      {editing ? (
        <>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void commit()
              } else if (e.key === "Escape") {
                e.preventDefault()
                setDraft(value ?? "")
                setEditing(false)
              }
            }}
            list={assignees ? datalistId : undefined}
            disabled={saving}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-xs font-medium outline-none focus:ring-0"
          />
          {assignees && (
            <datalist id={datalistId}>
              {assignees.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          title={`Click to edit ${label.toLowerCase()}`}
          className="group flex min-w-0 items-center gap-1.5 text-left transition-colors hover:text-foreground/80"
        >
          {value ? (
            <>
              <ColoredAvatar name={value} size={18} />
              <span className="truncate text-xs font-medium text-foreground">
                {value}
              </span>
            </>
          ) : (
            <span className="text-xs italic text-muted-foreground">
              {placeholder}
            </span>
          )}
          <Pencil className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
        </button>
      )}
    </div>
  )
}

function EditableHeading({
  value,
  placeholder,
  onSave,
}: {
  value: string
  placeholder: string
  onSave: (next: string) => Promise<void>
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  const [saving, setSaving] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setDraft(value)
  }, [value])

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  async function commit() {
    const next = draft.trim()
    if (!next || next === value) {
      setDraft(value)
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(next)
    } catch {
      setDraft(value)
    } finally {
      setEditing(false)
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            void commit()
          } else if (e.key === "Escape") {
            e.preventDefault()
            setDraft(value)
            setEditing(false)
          }
        }}
        disabled={saving}
        className="w-full bg-transparent text-xl font-semibold tracking-tight outline-none focus:ring-0 sm:text-2xl"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Click to rename"
      className="group flex w-fit items-center gap-2 text-left text-xl font-semibold tracking-tight transition-colors hover:text-foreground/90 sm:text-2xl"
    >
      <span>{value || placeholder}</span>
      <Pencil className="size-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
    </button>
  )
}


// ─────────────────────────────────────────────────────────────────────
// Timeline rail
// ─────────────────────────────────────────────────────────────────────

const shortDate = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

const monthLabel = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
})

const PIXELS_PER_DAY = 28

const DOW_LETTER = ["S", "M", "T", "W", "T", "F", "S"] as const

type MonthSegment = { start: number; end: number; label: string }

function monthSegments(start: Date, end: Date): MonthSegment[] {
  const segs: MonthSegment[] = []
  const total = daysBetween(start, end)
  if (total <= 0) return segs
  let cursorDate = new Date(start)
  let cursorPos = 0
  while (cursorPos < 100) {
    const nextMonthStart = new Date(
      cursorDate.getFullYear(),
      cursorDate.getMonth() + 1,
      1
    )
    if (nextMonthStart >= end) {
      segs.push({ start: cursorPos, end: 100, label: monthLabel.format(cursorDate) })
      break
    }
    const nextPos = Math.min(
      100,
      (daysBetween(start, nextMonthStart) / total) * 100
    )
    segs.push({ start: cursorPos, end: nextPos, label: monthLabel.format(cursorDate) })
    cursorDate = nextMonthStart
    cursorPos = nextPos
  }
  return segs
}

type DayMark = {
  pos: number
  date: Date
  isWeekend: boolean
  isMonday: boolean
  isMonthStart: boolean
}

function dayMarkers(start: Date, end: Date): DayMark[] {
  const total = daysBetween(start, end)
  if (total <= 0) return []
  const out: DayMark[] = []
  for (let i = 0; i <= total; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dow = d.getDay()
    out.push({
      pos: (i / total) * 100,
      date: d,
      isWeekend: dow === 0 || dow === 6,
      isMonday: dow === 1,
      isMonthStart: d.getDate() === 1,
    })
  }
  return out
}

type PhaseBand = {
  phase: Phase
  start: number
  end: number
  isActive: boolean
}

function phaseBands(
  phases: Phase[],
  projectStart: Date,
  projectEnd: Date,
  activeId: string | null
): PhaseBand[] {
  const total = daysBetween(projectStart, projectEnd)
  if (total <= 0 || phases.length === 0) return []

  const starts: number[] = []
  const ends: number[] = []

  for (let i = 0; i < phases.length; i++) {
    const p = phases[i]
    if (p.startDate) {
      const offset = daysBetween(
        projectStart,
        new Date(`${p.startDate}T00:00:00`)
      )
      starts[i] = Math.max(0, Math.min(100, (offset / total) * 100))
    } else if (i === 0) {
      starts[i] = 0
    } else if (ends[i - 1] !== undefined) {
      starts[i] = ends[i - 1]
    } else {
      starts[i] = (i / phases.length) * 100
    }

    if (p.endDate) {
      const offset = daysBetween(
        projectStart,
        new Date(`${p.endDate}T00:00:00`)
      )
      ends[i] = Math.max(0, Math.min(100, (offset / total) * 100))
    }
  }

  for (let i = 0; i < phases.length; i++) {
    if (ends[i] === undefined) {
      ends[i] = i < phases.length - 1 ? starts[i + 1] : 100
    }
    if (ends[i] < starts[i]) ends[i] = starts[i]
  }

  return phases.map((phase, i) => ({
    phase,
    start: starts[i],
    end: ends[i],
    isActive: phase.id === activeId,
  }))
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysBetween(from: Date, to: Date): number {
  return Math.round(
    (startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000
  )
}

function TimelineRail({
  project,
  phases: phasesProp,
}: {
  project: Project
  phases: Phase[]
}) {
  const [phases, setPhases] = React.useState<Phase[]>(phasesProp)
  React.useEffect(() => {
    setPhases(phasesProp)
  }, [phasesProp])

  const [meetings, setMeetings] = React.useState<Meeting[]>([])
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const rows = await listMeetings(project.id)
        if (!cancelled) setMeetings(rows)
      } catch {
        /* swallow — meetings are decorative on the rail */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [project.id])

  function handlePhaseChange(updated: Phase) {
    setPhases((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    )
  }

  const start = project.startDate
    ? new Date(`${project.startDate}T00:00:00`)
    : null
  const end = project.endDate ? new Date(`${project.endDate}T00:00:00`) : null

  if (!start || !end) {
    return (
      <EditDatesDialog project={project}>
        <button
          type="button"
          className="group flex w-full items-center justify-center rounded-md border border-dashed bg-background/30 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Pencil className="mr-2 size-3 opacity-60" />
          Set project start & end dates
        </button>
      </EditDatesDialog>
    )
  }

  const today = new Date()
  const totalDays = daysBetween(start, end)
  const elapsedDays = Math.max(0, daysBetween(start, today))
  const remainingDays = daysBetween(today, end)
  const pct =
    totalDays > 0
      ? Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100))
      : 0

  const remainingLabel =
    remainingDays < 0
      ? `${Math.abs(remainingDays)} days overdue`
      : remainingDays === 0
      ? "Ends today"
      : `${remainingDays} ${remainingDays === 1 ? "day" : "days"} left`

  const activePhase =
    phases.find((p) => p.status === "in_progress") ??
    phases.find((p) => p.status !== "completed") ??
    null

  const bands = phaseBands(phases, start, end, activePhase?.id ?? null)
  const months = monthSegments(start, end)
  const days = dayMarkers(start, end)

  const nowMs = today.getTime()
  const upcomingMeetingId =
    meetings
      .filter(
        (m) =>
          m.scheduledAt && new Date(m.scheduledAt).getTime() >= nowMs
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledAt!).getTime() -
          new Date(b.scheduledAt!).getTime()
      )[0]?.id ?? null

  const meetingMarkers = meetings
    .map((m) => {
      if (!m.scheduledAt) return null
      const dt = new Date(m.scheduledAt)
      if (Number.isNaN(dt.getTime())) return null
      const offset = daysBetween(start, dt)
      if (offset < 0 || offset > totalDays) return null
      return {
        meeting: m,
        pos: totalDays > 0 ? (offset / totalDays) * 100 : 0,
        isUpcoming: m.id === upcomingMeetingId,
      }
    })
    .filter(
      (
        x
      ): x is { meeting: Meeting; pos: number; isUpcoming: boolean } =>
        x !== null
    )
  const innerWidth = Math.max(totalDays * PIXELS_PER_DAY, 600)

  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Center today in the scroll viewport on first paint.
  React.useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const containerWidth = el.clientWidth
    if (innerWidth <= containerWidth) return
    const todayPx = (pct / 100) * innerWidth
    el.scrollLeft = Math.max(
      0,
      Math.min(innerWidth - containerWidth, todayPx - containerWidth / 2)
    )
  }, [pct, innerWidth])

  return (
    <div className="relative flex min-w-0 flex-col">
      <div
        ref={scrollRef}
        className="w-full min-w-0 overflow-x-auto"
      >
        <div
          className="relative pt-4"
          style={{ minWidth: `${innerWidth}px` }}
        >
          {/* TODAY pill — floats above the panel */}
          <span
            aria-hidden
            className="absolute top-0 z-20 -translate-x-1/2 select-none"
            style={{ left: `${pct}%` }}
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-[oklch(0.38_0.09_22)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-100 shadow-sm">
              Today
            </span>
          </span>

          <div className="relative h-44 overflow-hidden rounded-lg border bg-muted/20">
          {/* progress fill */}
          <div
            className={`absolute inset-y-0 left-0 transition-all ${
              remainingDays < 0 ? "bg-destructive/15" : "bg-primary/12"
            }`}
            style={{ width: `${pct}%` }}
          />

          {/* daily tick marks: weekends shaded, Mondays stronger */}
          {days.map((d, i) => (
            <span
              key={`d-tick-${i}`}
              aria-hidden
              className={`absolute inset-y-0 w-px ${
                d.isMonday ? "bg-border/60" : "bg-border/20"
              }`}
              style={{ left: `${d.pos}%` }}
            />
          ))}

          {/* weekend shading (subtle) */}
          {days
            .filter((d) => d.isWeekend && d.date.getDay() === 6)
            .map((sat, i) => {
              const widthDays = 2 / Math.max(totalDays, 1)
              return (
                <span
                  key={`wknd-${i}`}
                  aria-hidden
                  className="absolute inset-y-0 bg-muted/30"
                  style={{
                    left: `${sat.pos}%`,
                    width: `${widthDays * 100}%`,
                  }}
                />
              )
            })}

          {/* month dividers (stronger) */}
          {months.map((m, i) =>
            i === 0 ? null : (
              <span
                key={`m-${i}`}
                aria-hidden
                className="absolute inset-y-0 w-px bg-border"
                style={{ left: `${m.start}%` }}
              />
            )
          )}

          {/* month labels at top */}
          {months.map((m, i) => (
            <span
              key={`ml-${i}`}
              className="absolute top-1.5 -translate-x-1/2 text-[11px] font-semibold tracking-tight text-foreground/80"
              style={{ left: `${(m.start + m.end) / 2}%` }}
            >
              {m.label}
            </span>
          ))}

          {/* day-of-week letter row (every other day) */}
          {days
            .filter((_, i) => i % 2 === 0)
            .map((d, i) => (
              <span
                key={`dow-${i}`}
                className={`absolute top-7 -translate-x-1/2 text-[9px] uppercase tabular-nums ${
                  d.isWeekend ? "text-muted-foreground/40" : "text-muted-foreground/70"
                }`}
                style={{ left: `${d.pos}%` }}
              >
                {DOW_LETTER[d.date.getDay()]}
              </span>
            ))}

          {/* day-of-month numbers (every other day) */}
          {days
            .filter((_, i) => i % 2 === 0)
            .map((d, i) => (
              <span
                key={`dnum-${i}`}
                className={`absolute top-11 -translate-x-1/2 text-[10px] tabular-nums ${
                  d.isMonthStart
                    ? "font-semibold text-foreground/80"
                    : d.isMonday
                    ? "font-medium text-foreground/70"
                    : d.isWeekend
                    ? "text-muted-foreground/50"
                    : "text-muted-foreground"
                }`}
                style={{ left: `${d.pos}%` }}
              >
                {d.date.getDate()}
              </span>
            ))}

          {/* today vertical line */}
          <span
            aria-hidden
            className="absolute inset-y-0 z-10 w-0.5 bg-[oklch(0.38_0.09_22)]"
            style={{ left: `${pct}%` }}
          />

          {/* meeting markers — rectangular chips in their own lane below the bands */}
          {meetingMarkers.map(({ meeting, pos, isUpcoming }) => {
            const dt = new Date(meeting.scheduledAt!)
            return (
              <Tooltip key={meeting.id}>
                <TooltipTrigger
                  render={
                    <a
                      href={`/projects/${project.id}?tab=meetings`}
                      className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                      style={{
                        left: `${pos}%`,
                        top: "calc(50% + 32px)",
                      }}
                    >
                      <span className="relative inline-flex">
                        {isUpcoming && (
                          <>
                            <span
                              aria-hidden
                              className="absolute -inset-0.5 animate-ping rounded-md bg-emerald-500 opacity-70"
                              style={{ animationDuration: "2s" }}
                            />
                            <span
                              aria-hidden
                              className="absolute -inset-0.5 animate-ping rounded-md bg-emerald-400 opacity-50"
                              style={{
                                animationDuration: "2s",
                                animationDelay: "1s",
                              }}
                            />
                          </>
                        )}
                        <span
                          className={`relative inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[10px] font-bold leading-none text-emerald-50 transition-transform group-hover:scale-110 ${
                            isUpcoming
                              ? "bg-emerald-800 shadow-[0_0_28px_rgba(52,211,153,0.8),0_0_10px_rgba(52,211,153,0.6),0_0_3px_rgba(167,243,208,0.7)] ring-1 ring-emerald-300/70"
                              : "bg-emerald-900 shadow-sm ring-1 ring-emerald-700/40"
                          }`}
                        >
                          <Video className="size-3" />
                        </span>
                      </span>
                    </a>
                  }
                />
                <TooltipContent
                  side="top"
                  className="max-w-xs gap-0 border border-border bg-popover p-0 text-popover-foreground shadow-xl"
                >
                  <div className="flex flex-col gap-2 p-3">
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-emerald-800 text-emerald-50">
                        <Video className="size-3.5" />
                      </span>
                      <span className="text-sm font-semibold leading-tight">
                        {meeting.title}
                      </span>
                    </div>
                    <div className="text-xs tabular-nums text-muted-foreground">
                      {dt.toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                    {meeting.notes && (
                      <div className="line-clamp-3 text-xs text-muted-foreground">
                        {meeting.notes}
                      </div>
                    )}
                    {isUpcoming && (
                      <span className="mt-0.5 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-800/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                        Upcoming
                      </span>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}

          {/* phase bands — each phase as a labelled segment (click to open detail) */}
          {bands.map(({ phase, start: bs, end: be, isActive }) => {
            const status = phase.status
            const width = Math.max(be - bs, 0.5)
            const bandClass = isActive
              ? "border-primary/60 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              : status === "completed"
              ? "border-border bg-muted-foreground/15 text-muted-foreground line-through hover:bg-muted-foreground/25"
              : status === "in_review"
              ? "border-warning/40 bg-warning/15 text-foreground hover:bg-warning/25"
              : "border-border bg-background/60 text-muted-foreground hover:bg-background"
            const title = `${phase.name} · ${PHASE_STATUS_LABEL[status]}${
              phase.startDate ? ` · ${phase.startDate}` : ""
            }${phase.endDate ? ` → ${phase.endDate}` : ""}`
            return (
              <PhaseDetailDialog
                key={phase.id}
                projectId={project.id}
                phase={phase}
                onPhaseChange={handlePhaseChange}
              >
                <button
                  type="button"
                  title={title}
                  className={`absolute top-1/2 z-10 flex h-7 -translate-y-1/2 cursor-pointer items-center justify-center overflow-hidden rounded-md border px-2 text-[11px] font-medium leading-none transition-colors ${bandClass}`}
                  style={{ left: `${bs}%`, width: `${width}%` }}
                >
                  <span className="truncate">{phase.name}</span>
                </button>
              </PhaseDetailDialog>
            )
          })}

        </div>

        {/* sticky start/end date pills — flow-positioned so sticky works,
            pulled up with negative margin so they overlap inside the panel */}
        <div className="pointer-events-none relative z-30 -mt-9 flex w-full justify-between px-2">
          <span className="pointer-events-auto sticky left-2 rounded-md border border-info/40 bg-info/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-info shadow-sm">
            {shortDate.format(start)}
          </span>
          <span className="pointer-events-auto sticky right-2 rounded-md border border-info/40 bg-info/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-info shadow-sm">
            {shortDate.format(end)}
          </span>
        </div>
      </div>
      </div>

      {/* Caption — overlay inside the panel, pinned to viewport center, edit trigger */}
      <EditDatesDialog project={project}>
        <button
          type="button"
          className="group absolute -bottom-1 left-1/2 z-40 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-border/60 bg-background/85 px-2.5 py-1 text-[11px] tabular-nums text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:text-foreground"
        >
          {activePhase ? (
            <span className="font-semibold text-foreground">
              In {activePhase.name}
            </span>
          ) : (
            <span>
              {phases.length === 0 ? "No phases yet" : "All phases completed"}
            </span>
          )}
          <span className="opacity-40">·</span>
          <span>
            {Math.min(elapsedDays, totalDays)} / {totalDays}d ·{" "}
            {Math.round(pct)}%
          </span>
          <span className="opacity-40">·</span>
          <span className={remainingDays < 0 ? "text-destructive" : undefined}>
            {remainingLabel}
          </span>
          <Pencil className="ml-1 size-3 opacity-0 transition-opacity group-hover:opacity-60" />
        </button>
      </EditDatesDialog>
    </div>
  )
}

const PHASE_STATUS_LABEL: Record<Phase["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  in_review: "In review",
  completed: "Completed",
}

function EditDatesDialog({
  project,
  children,
}: {
  project: Project
  children: React.ReactElement
}) {
  const { setDates } = useProjects()
  const [open, setOpen] = React.useState(false)
  const [startDate, setStartDate] = React.useState(project.startDate ?? "")
  const [endDate, setEndDate] = React.useState(project.endDate ?? "")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setStartDate(project.startDate ?? "")
      setEndDate(project.endDate ?? "")
      setError(null)
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (startDate && endDate && endDate < startDate) {
      setError("End date can't be before start date.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await setDates(project.id, {
        startDate: startDate || null,
        endDate: endDate || null,
      })
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={children} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project timeline</DialogTitle>
          <DialogDescription>
            Set the start and end dates. The bar updates instantly.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="proj-start">Start date</Label>
            <Input
              id="proj-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="proj-end">End date</Label>
            <Input
              id="proj-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
