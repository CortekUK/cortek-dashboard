"use client"

import * as React from "react"
import {
  ArrowRight,
  CalendarRange,
  ChevronDown,
  ExternalLink,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { listMeetings, type Meeting } from "@/lib/meetings-db"
import { listPhases, type Phase } from "@/lib/phases-db"
import type { Project } from "@/lib/projects-db"
import { TASK_STATUS_TONE, TONE_CLASSES } from "@/lib/status-colors"
import { TASK_STATUS_LABEL } from "@/lib/tasks-db"
import { cn } from "@/lib/utils"

const DAY_MS = 86_400_000
const PX_PER_DAY = 32
const LABEL_COL_PX = 192
const AXIS_HEIGHT = 40

type ViewMode = "both" | "phases" | "meetings"

type RowSize = {
  row: number
  bar: number
  label: string
}

function resolveRowSize(rowCount: number): RowSize {
  if (rowCount <= 6) return { row: 60, bar: 34, label: "text-sm" }
  if (rowCount <= 12) return { row: 44, bar: 26, label: "text-sm" }
  if (rowCount <= 20) return { row: 34, bar: 20, label: "text-xs" }
  return { row: 28, bar: 16, label: "text-xs" }
}

export function TabTimeline({ project }: { project: Project }) {
  const [phases, setPhases] = React.useState<Phase[]>([])
  const [meetings, setMeetings] = React.useState<Meeting[]>([])
  const [loading, setLoading] = React.useState(true)
  const [viewMode, setViewMode] = React.useState<ViewMode>("both")
  const [hiddenPhaseIds, setHiddenPhaseIds] = React.useState<Set<string>>(
    () => new Set()
  )

  React.useEffect(() => {
    Promise.all([listPhases(project.id), listMeetings(project.id)]).then(
      ([p, m]) => {
        setPhases(p)
        setMeetings(m)
        setLoading(false)
      }
    )
  }, [project.id])

  if (loading) return <Skeleton className="h-full min-h-96 w-full" />

  const projectStart = parseDate(project.startDate)
  const projectEnd = parseDate(project.endDate)

  const phaseStarts = phases.map((p) => parseDate(p.startDate)).filter(isDate)
  const phaseEnds = phases.map((p) => parseDate(p.endDate)).filter(isDate)

  const axisStart = pickMin([projectStart, ...phaseStarts])
  const axisEnd = pickMax([projectEnd, ...phaseEnds])

  if (!axisStart || !axisEnd || axisEnd.getTime() <= axisStart.getTime()) {
    return (
      <div className="flex h-full min-h-96 flex-col items-center justify-center rounded-xl border border-dashed bg-card/30 p-10 text-center">
        <CalendarRange className="size-7 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Set start and end dates on the project and its phases to see the timeline.
        </p>
      </div>
    )
  }

  const range = axisEnd.getTime() - axisStart.getTime()
  const totalRangeDays = Math.max(1, Math.round(range / DAY_MS))
  const trackWidth = totalRangeDays * PX_PER_DAY
  const pxFor = (d: Date) =>
    Math.min(
      trackWidth,
      Math.max(0, ((d.getTime() - axisStart.getTime()) / range) * trackWidth)
    )

  const today = new Date()
  const todayInRange =
    today.getTime() >= axisStart.getTime() && today.getTime() <= axisEnd.getTime()

  const ticks = buildTicks(axisStart, axisEnd)

  const totalDays =
    projectStart && projectEnd
      ? Math.max(
          1,
          Math.round((projectEnd.getTime() - projectStart.getTime()) / DAY_MS)
        )
      : null

  const elapsedPct =
    projectStart && projectEnd
      ? Math.min(
          100,
          Math.max(
            0,
            ((Math.min(today.getTime(), projectEnd.getTime()) -
              projectStart.getTime()) /
              (projectEnd.getTime() - projectStart.getTime())) *
              100
          )
        )
      : null

  const showPhases = viewMode !== "meetings"
  const showMeetings = viewMode !== "phases"

  const visiblePhases = showPhases
    ? phases.filter((p) => !hiddenPhaseIds.has(p.id))
    : []

  const meetingsInRange = meetings
    .map((m) => ({ meeting: m, date: parseDate(m.scheduledAt) }))
    .filter(
      (m): m is { meeting: Meeting; date: Date } =>
        m.date !== null &&
        m.date.getTime() >= axisStart.getTime() &&
        m.date.getTime() <= axisEnd.getTime()
    )

  const visibleMeetings = showMeetings ? meetingsInRange : []
  const hasMeetingRow = visibleMeetings.length > 0
  const rowCount = visiblePhases.length + (hasMeetingRow ? 1 : 0)
  const sizes = resolveRowSize(rowCount)

  const togglePhase = (id: string) => {
    setHiddenPhaseIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allPhaseFilterChecked = hiddenPhaseIds.size === 0
  const phaseFilterLabel = allPhaseFilterChecked
    ? `All phases (${phases.length})`
    : `${phases.length - hiddenPhaseIds.size} of ${phases.length} phases`

  return (
    <TooltipProvider delay={150}>
      <div className="flex h-full min-h-0 flex-col gap-4">
        <ProjectHeader
          name={project.projectName}
          start={projectStart}
          end={projectEnd}
          totalDays={totalDays}
          elapsedPct={elapsedPct}
        />

        <div className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-xl border bg-card">
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={!showPhases || phases.length === 0}
                render={(props) => (
                  <Button
                    {...props}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {phaseFilterLabel}
                    <ChevronDown className="size-3.5 opacity-70" />
                  </Button>
                )}
              />
              <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuLabel>Show phases</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {phases.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    No phases
                  </div>
                ) : (
                  phases.map((phase) => (
                    <DropdownMenuCheckboxItem
                      key={phase.id}
                      checked={!hiddenPhaseIds.has(phase.id)}
                      onCheckedChange={() => togglePhase(phase.id)}
                      closeOnClick={false}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            TONE_CLASSES[TASK_STATUS_TONE[phase.status]].dot
                          )}
                        />
                        {phase.name}
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Timeline body */}
          <div className="flex min-h-0 flex-1">
            {/* Labels column (fixed) */}
            <div
              className="flex shrink-0 flex-col border-r border-border"
              style={{ width: LABEL_COL_PX }}
            >
              <div
                className="shrink-0 border-b border-border/60"
                style={{ height: AXIS_HEIGHT }}
              />
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-1 px-5 py-2">
                  {showPhases && visiblePhases.length === 0 && (
                    <div className="flex h-12 items-center text-xs italic text-muted-foreground">
                      {phases.length === 0 ? "No phases" : "All phases hidden"}
                    </div>
                  )}
                  {showPhases &&
                    visiblePhases.map((phase) => (
                      <div
                        key={phase.id}
                        className={cn(
                          "flex items-center gap-2 truncate font-medium",
                          sizes.label
                        )}
                        style={{ height: sizes.row }}
                      >
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            TONE_CLASSES[TASK_STATUS_TONE[phase.status]].dot
                          )}
                        />
                        <span className="truncate">{phase.name}</span>
                      </div>
                    ))}
                  {hasMeetingRow && (
                    <div
                      className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground"
                      style={{ height: sizes.row }}
                    >
                      <Users className="size-3.5" />
                      Meetings
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tracks column (scrollable) */}
            <div className="flex-1 overflow-auto">
              <div
                className="relative"
                style={{ width: trackWidth, minWidth: "100%" }}
              >
                {/* Axis row */}
                <div
                  className="sticky top-0 z-30 border-b border-border/60 bg-card"
                  style={{ height: AXIS_HEIGHT }}
                >
                  {ticks.map((t, i) => (
                    <span
                      key={i}
                      className="absolute top-3 -translate-x-1/2 text-[11px] uppercase tracking-wide text-muted-foreground"
                      style={{ left: pxFor(t.date) }}
                    >
                      {t.label}
                    </span>
                  ))}
                  {projectStart && (
                    <BoundFlag x={pxFor(projectStart)} label="Start" />
                  )}
                  {projectEnd && (
                    <BoundFlag x={pxFor(projectEnd)} label="End" align="end" />
                  )}
                </div>

                {/* Tracks area */}
                <div className="relative py-2">
                  {/* Gridlines */}
                  {ticks.map((t, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-border/30"
                      style={{ left: pxFor(t.date) }}
                    />
                  ))}

                  {/* Project bound lines */}
                  {projectStart && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-border"
                      style={{ left: pxFor(projectStart) }}
                    />
                  )}
                  {projectEnd && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-border"
                      style={{ left: pxFor(projectEnd) }}
                    />
                  )}

                  {/* Rows */}
                  <div className="relative space-y-1">
                    {showPhases && visiblePhases.length === 0 && (
                      <div style={{ height: sizes.row }} />
                    )}
                    {showPhases &&
                      visiblePhases.map((phase) => (
                        <PhaseRow
                          key={phase.id}
                          phase={phase}
                          pxFor={pxFor}
                          rowHeight={sizes.row}
                          barHeight={sizes.bar}
                        />
                      ))}
                    {hasMeetingRow && (
                      <div
                        className="relative"
                        style={{ height: sizes.row }}
                      >
                        {visibleMeetings.map(({ meeting, date }) => (
                          <MeetingMarker
                            key={meeting.id}
                            meeting={meeting}
                            date={date}
                            x={pxFor(date)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Today indicator (overlays everything below axis) */}
                {todayInRange && (
                  <TodayOverlay
                    x={pxFor(today)}
                    axisHeight={AXIS_HEIGHT}
                    today={today}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

function TodayOverlay({
  x,
  axisHeight,
  today,
}: {
  x: number
  axisHeight: number
  today: Date
}) {
  return (
    <>
      {/* Glow band — spans full height including axis */}
      <div
        className="pointer-events-none absolute top-0 bottom-0 z-20"
        style={{ left: x - 6, width: 12 }}
      >
        <div className="h-full w-full bg-primary/10 blur-[3px]" />
      </div>
      {/* Hard line — full height */}
      <div
        className="pointer-events-none absolute top-0 bottom-0 z-30 w-0.5 -translate-x-1/2 bg-primary"
        style={{ left: x }}
      />
      {/* Badge — anchored in the axis row */}
      <div
        className="pointer-events-none absolute z-40"
        style={{ left: x, top: 6 }}
      >
        <div
          className="-translate-x-1/2 rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-sm shadow-primary/30 ring-1 ring-primary/60"
          title={formatDate(today)}
        >
          Today
        </div>
      </div>
      {/* Filled cap at axis bottom */}
      <div
        className="pointer-events-none absolute z-40"
        style={{ left: x, top: axisHeight - 4 }}
      >
        <div className="-translate-x-1/2 size-2 rounded-full bg-primary shadow-sm shadow-primary/40" />
      </div>
    </>
  )
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode
  onChange: (v: ViewMode) => void
}) {
  const options: { value: ViewMode; label: string }[] = [
    { value: "both", label: "Both" },
    { value: "phases", label: "Phases" },
    { value: "meetings", label: "Meetings" },
  ]
  return (
    <div className="inline-flex rounded-md border border-border bg-background p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-sm px-3 py-1 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function ProjectHeader({
  name,
  start,
  end,
  totalDays,
  elapsedPct,
}: {
  name: string
  start: Date | null
  end: Date | null
  totalDays: number | null
  elapsedPct: number | null
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-medium">{name}</h2>
        {totalDays != null && (
          <span className="text-xs text-muted-foreground">
            {totalDays} {totalDays === 1 ? "day" : "days"}
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
        <span className={start ? "text-foreground" : "italic text-muted-foreground"}>
          {start ? formatDate(start) : "No start date"}
        </span>
        <ArrowRight className="size-3 text-muted-foreground" />
        <span className={end ? "text-foreground" : "italic text-muted-foreground"}>
          {end ? formatDate(end) : "No end date"}
        </span>
        {elapsedPct != null && (
          <span className="ml-auto text-xs text-muted-foreground">
            {Math.round(elapsedPct)}% elapsed
          </span>
        )}
      </div>
      {elapsedPct != null && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${elapsedPct}%` }}
          />
        </div>
      )}
    </div>
  )
}

function PhaseRow({
  phase,
  pxFor,
  rowHeight,
  barHeight,
}: {
  phase: Phase
  pxFor: (d: Date) => number
  rowHeight: number
  barHeight: number
}) {
  const start = parseDate(phase.startDate)
  const end = parseDate(phase.endDate)
  const tone = TASK_STATUS_TONE[phase.status]

  if (!start || !end || end.getTime() <= start.getTime()) {
    return (
      <div
        className="relative flex items-center pl-2"
        style={{ height: rowHeight }}
      >
        <span className="text-[11px] italic text-muted-foreground">
          No dates set
        </span>
      </div>
    )
  }

  const left = pxFor(start)
  const width = Math.max(4, pxFor(end) - left)

  return (
    <div className="relative" style={{ height: rowHeight }}>
      <Tooltip>
        <TooltipTrigger
          render={(props) => (
            <div
              {...props}
              className={cn(
                "absolute top-1/2 flex -translate-y-1/2 items-center overflow-hidden rounded-md px-2.5 text-[12px] font-medium",
                TONE_CLASSES[tone].solid
              )}
              style={{ left, width, height: barHeight }}
            >
              <span className="truncate">
                {formatShort(start)} – {formatShort(end)}
              </span>
            </div>
          )}
        />
        <TooltipContent>
          <div className="space-y-0.5">
            <div className="text-sm font-medium">{phase.name}</div>
            <div className="text-xs text-muted-foreground">
              {formatDate(start)} → {formatDate(end)}
            </div>
            <div className="text-xs">{TASK_STATUS_LABEL[phase.status]}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function MeetingMarker({
  meeting,
  date,
  x,
}: {
  meeting: Meeting
  date: Date
  x: number
}) {
  return (
    <div
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ left: x }}
    >
      <Popover>
        <PopoverTrigger
          render={(props) => (
            <button
              {...props}
              type="button"
              className="flex size-7 items-center justify-center rounded-full border border-info/40 bg-info/15 text-info transition-all hover:border-info hover:bg-info/25 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/40 aria-expanded:border-info aria-expanded:bg-info aria-expanded:text-info-foreground"
              aria-label={meeting.title}
            >
              <Users className="size-3.5" strokeWidth={2.25} />
            </button>
          )}
        />
        <PopoverContent>
          <MeetingCard meeting={meeting} date={date} />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function MeetingCard({ meeting, date }: { meeting: Meeting; date: Date }) {
  const relative = formatRelative(date, new Date())
  const notesPreview = (meeting.notes ?? "").trim()
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-start gap-2">
          <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-info/15 text-info">
            <Users className="size-3.5" strokeWidth={2.25} />
          </span>
          <h4 className="text-sm font-semibold leading-tight">
            {meeting.title}
          </h4>
        </div>
        <div className="flex items-baseline gap-2 pl-8 text-xs">
          <span className="text-foreground">{formatDateTime(date)}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{relative}</span>
        </div>
      </div>
      {notesPreview && (
        <div className="rounded-md border border-border/60 bg-muted/40 p-2.5">
          <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
            {notesPreview}
          </p>
        </div>
      )}
      {meeting.fathomUrl && (
        <a
          href={meeting.fathomUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ExternalLink className="size-3.5" />
          Open recording
        </a>
      )}
    </div>
  )
}

function BoundFlag({
  x,
  label,
  align = "start",
}: {
  x: number
  label: string
  align?: "start" | "end"
}) {
  return (
    <span
      className={cn(
        "absolute top-0.5 text-[10px] uppercase tracking-wide text-muted-foreground/80",
        align === "start" ? "translate-x-1" : "-translate-x-[calc(100%+4px)]"
      )}
      style={{ left: x }}
    >
      {label}
    </span>
  )
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function isDate(d: Date | null): d is Date {
  return d !== null
}

function pickMin(ds: (Date | null)[]): Date | null {
  const valid = ds.filter(isDate)
  if (valid.length === 0) return null
  return valid.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b))
}

function pickMax(ds: (Date | null)[]): Date | null {
  const valid = ds.filter(isDate)
  if (valid.length === 0) return null
  return valid.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b))
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatShort(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function formatDateTime(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatRelative(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / DAY_MS)
  if (diffDays === 0) return "today"
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

function buildTicks(start: Date, end: Date): { date: Date; label: string }[] {
  const days = (end.getTime() - start.getTime()) / DAY_MS
  const ticks: { date: Date; label: string }[] = []

  if (days <= 21) {
    const cur = startOfDay(start)
    while (cur.getTime() <= end.getTime()) {
      ticks.push({ date: new Date(cur), label: formatShort(cur) })
      cur.setDate(cur.getDate() + 1)
    }
  } else if (days <= 120) {
    const cur = startOfDay(start)
    while (cur.getTime() <= end.getTime()) {
      ticks.push({ date: new Date(cur), label: formatShort(cur) })
      cur.setDate(cur.getDate() + 7)
    }
  } else {
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    if (cur.getTime() < start.getTime()) cur.setMonth(cur.getMonth() + 1)
    while (cur.getTime() <= end.getTime()) {
      ticks.push({
        date: new Date(cur),
        label: cur.toLocaleDateString(undefined, { month: "short" }),
      })
      cur.setMonth(cur.getMonth() + 1)
    }
  }
  return ticks
}

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}
