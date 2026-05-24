"use client"

import * as React from "react"
import {
  CalendarRange,
  Check,
  ChevronDown,
  ClipboardCopy,
  Eye,
  EyeOff,
  ExternalLink,
  Flag,
  Globe,
  Hourglass,
  KeyRound,
  Pencil,
  Sparkles,
  User,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ColoredAvatar } from "@/components/ui/colored-avatar"
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
import { StatusPill } from "@/components/ui/status-pill"
import type { Phase } from "@/lib/phases-db"
import { useProjects, type Project, type ProjectStage } from "@/lib/projects-context"
import {
  PROJECT_STAGE_TONE,
  TASK_STATUS_TONE,
  TONE_CLASSES,
  type StatusTone,
} from "@/lib/status-colors"
import { TASK_STATUS_LABEL } from "@/lib/tasks-db"

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
    <div className="flex flex-col gap-6">
      <PhaseProgressBanner project={project} phases={phases} />

      <section className="rounded-2xl border bg-card">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Project overview
          </h2>
          <span className="text-[11px] text-muted-foreground">
            we'll build on top of this
          </span>
        </header>

        <dl className="grid gap-x-10 gap-y-7 p-6 sm:grid-cols-2">
          <Field label="Client">
            <span className="text-base font-medium">{project.clientName}</span>
          </Field>

          <Field label="Status">
            <StageStatusValue project={project} />
          </Field>

          <Field label="Project name">
            <span className="text-base font-medium">{project.projectName}</span>
          </Field>

          <Field label="Project ID">
            <ProjectIdValue id={project.id} />
          </Field>

          <Field label="Live URL" wide>
            <LiveUrlValue project={project} />
          </Field>

          <Field label="Demo credentials" wide>
            <DemoCredentialsValue project={project} />
          </Field>

          <Field label="Devs" wide>
            <DevsValue assignees={assignees} />
          </Field>
        </dl>
      </section>
    </div>
  )
}

function Field({
  label,
  wide,
  children,
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="flex flex-wrap items-center gap-2">{children}</dd>
    </div>
  )
}

function StageStatusValue({ project }: { project: Project }) {
  const { setStage } = useProjects()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        nativeButton={false}
        render={
          <StatusPill
            tone={PROJECT_STAGE_TONE[project.stage]}
            dot
            size="lg"
            className="cursor-pointer"
          >
            {STAGE_LABEL[project.stage]}
            <ChevronDown className="size-3" />
          </StatusPill>
        }
      />
      <DropdownMenuContent align="start">
        {(Object.keys(STAGE_LABEL) as ProjectStage[]).map((s) => (
          <DropdownMenuItem
            key={s}
            className="gap-2"
            onClick={() => {
              if (s !== project.stage) void setStage(project.id, s)
            }}
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

function ProjectIdValue({ id }: { id: string }) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Click to copy"
      className="group inline-flex items-center gap-2 rounded-md border border-border bg-background/40 px-2.5 py-1 font-mono text-xs text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
    >
      <span className="break-all">{id}</span>
      {copied ? (
        <Check className="size-3.5 shrink-0 text-success" />
      ) : (
        <ClipboardCopy className="size-3.5 shrink-0 opacity-50 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  )
}

function LiveUrlValue({ project }: { project: Project }) {
  const { setLiveUrl } = useProjects()
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(project.liveUrl ?? "")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    setDraft(project.liveUrl ?? "")
  }, [project.liveUrl])

  async function handleSave() {
    const trimmed = draft.trim()
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      setError("URL must start with http:// or https://")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await setLiveUrl(project.id, trimmed || null)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraft(project.liveUrl ?? "")
    setError(null)
    setEditing(false)
  }

  async function handleCopy() {
    if (!project.liveUrl) return
    try {
      await navigator.clipboard.writeText(project.liveUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {}
  }

  if (editing) {
    return (
      <div className="flex w-full flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://drive247.com"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void handleSave()
              } else if (e.key === "Escape") {
                handleCancel()
              }
            }}
            className="max-w-md"
          />
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            <Check />
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            <X />
            Cancel
          </Button>
        </div>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    )
  }

  if (!project.liveUrl) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setEditing(true)}
        className="text-muted-foreground"
      >
        <Globe />
        Add live URL
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={project.liveUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md border border-info/25 bg-info/10 px-2.5 py-1 text-sm font-medium text-info underline-offset-2 transition-colors hover:bg-info/15 hover:underline"
      >
        <Globe className="size-3.5" />
        <span className="break-all">{project.liveUrl}</span>
        <ExternalLink className="size-3.5" />
      </a>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Copy URL"
        onClick={handleCopy}
      >
        {copied ? <Check className="text-success" /> : <ClipboardCopy />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Edit URL"
        onClick={() => setEditing(true)}
      >
        <Pencil />
      </Button>
    </div>
  )
}

function DemoCredentialsValue({ project }: { project: Project }) {
  const { setDemoCredentials } = useProjects()
  const [editing, setEditing] = React.useState(false)
  const [draftUser, setDraftUser] = React.useState(project.demoUsername ?? "")
  const [draftPass, setDraftPass] = React.useState(project.demoPassword ?? "")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [revealed, setRevealed] = React.useState(false)
  const [copied, setCopied] = React.useState<"user" | "pass" | null>(null)

  React.useEffect(() => {
    setDraftUser(project.demoUsername ?? "")
    setDraftPass(project.demoPassword ?? "")
  }, [project.demoUsername, project.demoPassword])

  const hasCreds = !!(project.demoUsername || project.demoPassword)

  async function copy(value: string, which: "user" | "pass") {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(which)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {}
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await setDemoCredentials(project.id, {
        demoUsername: draftUser.trim() || null,
        demoPassword: draftPass || null,
      })
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setDraftUser(project.demoUsername ?? "")
    setDraftPass(project.demoPassword ?? "")
    setError(null)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex w-full max-w-lg flex-col gap-3 rounded-lg border bg-background/40 p-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="demo-user" className="text-[11px] text-muted-foreground">
            Login / email
          </Label>
          <Input
            id="demo-user"
            value={draftUser}
            onChange={(e) => setDraftUser(e.target.value)}
            placeholder="admin@example.com"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="demo-pass" className="text-[11px] text-muted-foreground">
            Password
          </Label>
          <Input
            id="demo-pass"
            type="text"
            value={draftPass}
            onChange={(e) => setDraftPass(e.target.value)}
            placeholder="••••••••"
            className="font-mono"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            <X />
            Cancel
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            <Check />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    )
  }

  if (!hasCreds) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setEditing(true)}
        className="text-muted-foreground"
      >
        <KeyRound />
        Add demo credentials
      </Button>
    )
  }

  return (
    <div className="flex w-full max-w-lg flex-col gap-1.5">
      {project.demoUsername && (
        <div className="group/cred flex items-center gap-2 rounded-md border bg-background/40 px-3 py-2">
          <User className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate font-mono text-sm">
            {project.demoUsername}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Copy login"
            onClick={() => copy(project.demoUsername!, "user")}
          >
            {copied === "user" ? (
              <Check className="text-success" />
            ) : (
              <ClipboardCopy />
            )}
          </Button>
        </div>
      )}
      {project.demoPassword && (
        <div className="group/cred flex items-center gap-2 rounded-md border bg-background/40 px-3 py-2">
          <KeyRound className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate font-mono text-sm">
            {revealed
              ? project.demoPassword
              : "•".repeat(Math.min(16, Math.max(8, project.demoPassword.length)))}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={revealed ? "Hide password" : "Reveal password"}
            onClick={() => setRevealed((v) => !v)}
          >
            {revealed ? <EyeOff /> : <Eye />}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Copy password"
            onClick={() => copy(project.demoPassword!, "pass")}
          >
            {copied === "pass" ? (
              <Check className="text-success" />
            ) : (
              <ClipboardCopy />
            )}
          </Button>
        </div>
      )}
      <div>
        <Button
          variant="ghost"
          size="xs"
          className="-ml-2 text-muted-foreground"
          onClick={() => setEditing(true)}
        >
          <Pencil />
          Edit credentials
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Phase-progress banner
// ─────────────────────────────────────────────────────────────────────

const longDateFormatter = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
})

const shortDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysBetween(from: Date, to: Date): number {
  return Math.round(
    (startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000
  )
}

function PhaseProgressBanner({
  project,
  phases,
}: {
  project: Project
  phases: Phase[]
}) {
  const today = new Date()
  const start = project.startDate
    ? new Date(`${project.startDate}T00:00:00`)
    : null
  const end = project.endDate
    ? new Date(`${project.endDate}T00:00:00`)
    : null

  const currentPhase =
    phases.find((p) => p.status === "in_progress") ??
    phases.find((p) => p.status !== "completed") ??
    null

  const totalDays = start && end ? daysBetween(start, end) : null
  const elapsedDays = start ? Math.max(0, daysBetween(start, today)) : null
  const remainingDays = end ? daysBetween(today, end) : null

  let pct: number | null = null
  if (totalDays !== null && totalDays > 0 && elapsedDays !== null) {
    pct = Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100))
  }

  // Tone for the countdown chip
  let countdownTone: StatusTone = "info"
  let countdownLabel: string
  if (remainingDays === null) {
    countdownLabel = "End date not set"
    countdownTone = "neutral"
  } else if (remainingDays < 0) {
    countdownLabel = `${Math.abs(remainingDays)} days overdue`
    countdownTone = "destructive"
  } else if (remainingDays === 0) {
    countdownLabel = "Ends today"
    countdownTone = "warning"
  } else if (remainingDays <= 7) {
    countdownLabel = `${remainingDays} days left`
    countdownTone = "warning"
  } else if (remainingDays <= 30) {
    countdownLabel = `${remainingDays} days left`
    countdownTone = "info"
  } else {
    countdownLabel = `${remainingDays} days left`
    countdownTone = "success"
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Today
            <span className="text-foreground">
              · {longDateFormatter.format(today)}
            </span>
          </div>
          <StatusPill tone={countdownTone} dot size="lg">
            <Hourglass className="size-3" />
            {countdownLabel}
          </StatusPill>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Currently in
          </span>
          {currentPhase ? (
            <StatusPill
              tone={TASK_STATUS_TONE[currentPhase.status]}
              dot
              size="lg"
            >
              <Flag className="size-3" />
              {currentPhase.name}
              <span className="opacity-70">
                · {TASK_STATUS_LABEL[currentPhase.status]}
              </span>
            </StatusPill>
          ) : (
            <span className="text-sm text-muted-foreground">
              {phases.length === 0
                ? "No phases yet — add one in the Tasks tab."
                : "All phases completed."}
            </span>
          )}
        </div>

        <ProjectTimelineRail
          project={project}
          start={start}
          end={end}
          elapsedDays={elapsedDays}
          remainingDays={remainingDays}
          totalDays={totalDays}
          pct={pct}
        />
      </div>
    </section>
  )
}

function ProjectTimelineRail({
  project,
  start,
  end,
  elapsedDays,
  remainingDays,
  totalDays,
  pct,
}: {
  project: Project
  start: Date | null
  end: Date | null
  elapsedDays: number | null
  remainingDays: number | null
  totalDays: number | null
  pct: number | null
}) {
  if (!start || !end) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed bg-background/30 px-4 py-3 text-sm">
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <CalendarRange className="size-4" />
          {project.startDate || project.endDate
            ? "Set both start and end dates to see the timeline."
            : "Set the project start and end dates to track progress."}
        </span>
        <EditProjectDatesDialog project={project} />
      </div>
    )
  }

  const safePct = pct ?? 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <CalendarRange className="size-3.5 text-info" />
          {shortDateFormatter.format(start)}
        </span>
        <span className="tabular-nums">
          {elapsedDays !== null && totalDays !== null
            ? `${Math.min(elapsedDays, totalDays)} / ${totalDays} days · ${Math.round(safePct)}%`
            : ""}
        </span>
        <span className="inline-flex items-center gap-1.5 text-foreground">
          {shortDateFormatter.format(end)}
          <Flag className="size-3.5 text-warning" />
        </span>
      </div>

      <div className="relative h-2.5 overflow-visible rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${safePct}%` }}
        />
        {pct !== null && pct >= 0 && pct <= 100 && (
          <span
            aria-hidden
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${safePct}%` }}
          >
            <span className="grid size-4 place-items-center rounded-full bg-background ring-2 ring-primary">
              <span className="size-1.5 rounded-full bg-primary" />
            </span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {elapsedDays !== null && elapsedDays >= 0
            ? `${elapsedDays} ${elapsedDays === 1 ? "day" : "days"} in`
            : start.getTime() > new Date().getTime()
            ? `starts ${shortDateFormatter.format(start)}`
            : ""}
        </span>
        <EditProjectDatesDialog project={project} compact />
        <span
          className={
            remainingDays !== null && remainingDays < 0
              ? "text-destructive"
              : ""
          }
        >
          {remainingDays !== null
            ? remainingDays >= 0
              ? `${remainingDays} ${remainingDays === 1 ? "day" : "days"} left`
              : `${Math.abs(remainingDays)} ${
                  Math.abs(remainingDays) === 1 ? "day" : "days"
                } overdue`
            : ""}
        </span>
      </div>
    </div>
  )
}

function EditProjectDatesDialog({
  project,
  compact,
}: {
  project: Project
  compact?: boolean
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
      <DialogTrigger
        render={
          compact ? (
            <Button
              variant="ghost"
              size="xs"
              type="button"
              className="text-muted-foreground"
            >
              <Pencil />
              Edit dates
            </Button>
          ) : (
            <Button variant="outline" size="sm" type="button">
              <CalendarRange />
              Set dates
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project timeline</DialogTitle>
          <DialogDescription>
            Set the start and end dates. The banner updates instantly.
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

function DevsValue({ assignees }: { assignees: string[] }) {
  if (assignees.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">
        Unassigned — add an assignee on any task to fill this in.
      </span>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {assignees.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-2 rounded-full border bg-background/40 py-1 pl-1 pr-3"
        >
          <ColoredAvatar name={name} size={22} />
          <span className="text-sm font-medium">{name}</span>
        </span>
      ))}
    </div>
  )
}
