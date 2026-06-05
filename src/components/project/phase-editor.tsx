"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  CalendarClock,
  CalendarRange,
  ChevronDown,
  Plus,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
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
  deletePhase,
  insertPhase,
  updatePhase,
  type Phase,
} from "@/lib/phases-db"
import type { Project } from "@/lib/projects-context"
import { phaseToneFor, TASK_STATUS_TONE, TONE_CLASSES } from "@/lib/status-colors"
import {
  deleteTask,
  insertTask,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  updateTask,
  type Task,
  type TaskStatus,
} from "@/lib/tasks-db"

type Props = {
  project: Project
  phase: Phase | null
  tasks: Task[]
}

export function PhaseEditor({ project, phase, tasks }: Props) {
  if (phase === null) {
    return <CreatePhaseScreen project={project} />
  }
  return (
    <EditPhaseScreen
      project={project}
      initialPhase={phase}
      initialTasks={tasks}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Create mode — minimal form. After save, redirect to the edit screen so
// goals/tasks can be added against a real phase id.
// ─────────────────────────────────────────────────────────────────────────

function CreatePhaseScreen({ project }: { project: Project }) {
  const router = useRouter()
  const [name, setName] = React.useState("")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const canSave =
    name.trim().length > 0 &&
    startDate.length > 0 &&
    endDate.length > 0 &&
    startDate <= endDate

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const created = await insertPhase({
        projectId: project.id,
        name,
        startDate,
        endDate,
      })
      router.push(`/projects/${project.id}/phases/${created.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create phase")
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Breadcrumb project={project} label="New phase" />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">New phase</h1>
        <p className="text-sm text-muted-foreground">
          Set the name and planned timeline. You&rsquo;ll be able to add goals
          and tasks on the next screen.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid max-w-2xl gap-5 rounded-xl border bg-card p-6"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phase-name">Phase name</Label>
          <Input
            id="phase-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Discovery, Design, Launch"
            autoFocus
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DateField
            id="phase-start"
            label="Start date"
            value={startDate}
            onChange={setStartDate}
          />
          <DateField
            id="phase-end"
            label="End date"
            value={endDate}
            onChange={setEndDate}
            min={startDate || undefined}
          />
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            type="button"
            nativeButton={false}
            render={<Link href={`/projects/${project.id}`}>Cancel</Link>}
          />
          <Button type="submit" disabled={!canSave || saving}>
            {saving ? "Creating…" : "Create phase"}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Edit mode — inline autosave on name/dates/status, plus full goals + tasks
// management lifted from tab-phases.
// ─────────────────────────────────────────────────────────────────────────

function EditPhaseScreen({
  project,
  initialPhase,
  initialTasks,
}: {
  project: Project
  initialPhase: Phase
  initialTasks: Task[]
}) {
  const router = useRouter()
  const [phase, setPhase] = React.useState<Phase>(initialPhase)
  const [name, setName] = React.useState(initialPhase.name)
  const [startDate, setStartDate] = React.useState(initialPhase.startDate ?? "")
  const [endDate, setEndDate] = React.useState(initialPhase.endDate ?? "")
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks)
  const [newTask, setNewTask] = React.useState("")
  const [savingField, setSavingField] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const statusTone = TASK_STATUS_TONE[phase.status]
  const phaseTone = phaseToneFor(phase.id)
  const phasePalette = TONE_CLASSES[phaseTone]

  async function commitPhase(
    field: string,
    patch: Parameters<typeof updatePhase>[1]
  ) {
    setSavingField(field)
    setError(null)
    try {
      const updated = await updatePhase(phase.id, patch)
      setPhase(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to save ${field}`)
    } finally {
      setSavingField(null)
    }
  }

  async function handleStatus(s: TaskStatus) {
    if (s === phase.status) return
    await commitPhase("status", { status: s })
  }

  async function handleDeletePhase() {
    if (!confirm("Delete this phase? Tasks in it will become unassigned.")) return
    await deletePhase(phase.id)
    router.push(`/projects/${project.id}`)
  }

  // ── Tasks ─────────────────────────────────────────────────────────────
  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    const title = newTask.trim()
    if (!title) return
    const created = await insertTask({
      projectId: project.id,
      phaseId: phase.id,
      title,
      position: tasks.length,
    })
    setTasks((prev) => [...prev, created])
    setNewTask("")
  }

  async function handleTaskStatus(task: Task, status: TaskStatus) {
    if (task.status === status) return
    const updated = await updateTask(task.id, { status })
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
  }

  async function handleDeleteTask(id: string) {
    await deleteTask(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const completedTasks = tasks.filter((t) => t.status === "completed").length

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <Breadcrumb project={project} label={phase.name} />

      <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
        <span
          aria-hidden
          className={`absolute inset-y-0 left-0 w-1 ${phasePalette.dot}`}
        />
        <div className="relative flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <DropdownMenu>
              <DropdownMenuTrigger
                nativeButton={false}
                render={
                  <StatusPill
                    tone={statusTone}
                    dot
                    size="md"
                    className="cursor-pointer"
                  >
                    {TASK_STATUS_LABEL[phase.status]}
                    <ChevronDown className="size-3" />
                  </StatusPill>
                }
              />
              <DropdownMenuContent align="start">
                {TASK_STATUS_ORDER.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleStatus(s)}
                    className="gap-2"
                  >
                    <span
                      className={`size-2 rounded-full ${TONE_CLASSES[TASK_STATUS_TONE[s]].dot}`}
                    />
                    {TASK_STATUS_LABEL[s]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {savingField && (
              <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-info">
                Saving…
              </span>
            )}
          </div>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              const next = name.trim()
              if (next && next !== phase.name) {
                void commitPhase("name", { name: next })
              } else {
                setName(phase.name)
              }
            }}
            className="h-auto border-transparent bg-transparent px-0 text-2xl font-semibold tracking-tight shadow-none focus-visible:border-transparent md:text-3xl"
            placeholder="Phase name"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          {/* Tasks */}
          <section className="flex flex-col gap-3 rounded-xl border bg-card p-5">
            <header className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Tasks</h2>
              <span className="text-xs text-muted-foreground">
                {completedTasks}/{tasks.length} done
              </span>
            </header>

            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tasks in this phase yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="group flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-muted/60"
                  >
                    <Link
                      href={`/projects/${project.id}/tasks/${task.id}`}
                      className={`flex-1 truncate text-sm underline-offset-2 hover:underline ${
                        task.status === "completed"
                          ? "text-muted-foreground line-through"
                          : ""
                      }`}
                    >
                      {task.title}
                    </Link>
                    {task.source === "fathom" && (
                      <span className="inline-flex h-5 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                        AI
                      </span>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        nativeButton={false}
                        render={
                          <StatusPill
                            tone={TASK_STATUS_TONE[task.status]}
                            dot
                            size="sm"
                            className="cursor-pointer"
                          >
                            {TASK_STATUS_LABEL[task.status]}
                            <ChevronDown className="size-3" />
                          </StatusPill>
                        }
                      />
                      <DropdownMenuContent align="end">
                        {TASK_STATUS_ORDER.map((s) => (
                          <DropdownMenuItem
                            key={s}
                            onClick={() => handleTaskStatus(task, s)}
                            className="gap-2"
                          >
                            <span
                              className={`size-2 rounded-full ${TONE_CLASSES[TASK_STATUS_TONE[s]].dot}`}
                            />
                            {TASK_STATUS_LABEL[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Delete task ${task.title}`}
                      className="opacity-0 group-hover:opacity-100"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <form
              onSubmit={handleAddTask}
              className="flex items-center gap-2 pt-1"
            >
              <Input
                placeholder="Add a task…"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                className="h-8 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                disabled={!newTask.trim()}
              >
                <Plus />
                Task
              </Button>
            </form>
          </section>
        </div>

        <aside className="flex h-fit flex-col gap-4 rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="phase-start"
              className="text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              Start date
            </Label>
            <div className="relative">
              <CalendarClock className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phase-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onBlur={() => {
                  const next = startDate || null
                  if (next !== (phase.startDate ?? null)) {
                    void commitPhase("startDate", { startDate: next })
                  }
                }}
                className="pl-8"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="phase-end"
              className="text-[11px] uppercase tracking-wider text-muted-foreground"
            >
              End date
            </Label>
            <div className="relative">
              <CalendarRange className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phase-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onBlur={() => {
                  const next = endDate || null
                  if (next !== (phase.endDate ?? null)) {
                    void commitPhase("endDate", { endDate: next })
                  }
                }}
                min={startDate || undefined}
                className="pl-8"
              />
            </div>
          </div>

          <div className="mt-1 border-t pt-3">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleDeletePhase}
            >
              <Trash2 />
              Delete phase
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-bits
// ─────────────────────────────────────────────────────────────────────────

function Breadcrumb({ project, label }: { project: Project; label: string }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
      <Button
        variant="ghost"
        size="sm"
        render={
          <Link href={`/projects/${project.id}`}>
            <ArrowLeft />
            {project.projectName}
          </Link>
        }
      />
      <span className="text-border">/</span>
      <span className="truncate">{label}</span>
    </nav>
  )
}

function DateField({
  id,
  label,
  value,
  onChange,
  min,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  min?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
      />
    </div>
  )
}

