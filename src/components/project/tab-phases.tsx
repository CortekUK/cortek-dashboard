"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  CalendarRange,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  KanbanSquare,
  List,
  Pencil,
  Plus,
  Square,
  Target,
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
import { Skeleton } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/ui/status-pill"
import { KanbanBoard } from "@/components/project/kanban-board"
import { TASK_STATUS_TONE, TONE_CLASSES } from "@/lib/status-colors"
import {
  deletePhase,
  listPhases,
  updatePhase,
  type Phase,
} from "@/lib/phases-db"
import {
  deletePhaseGoal,
  insertPhaseGoal,
  listGoalsForPhases,
  updatePhaseGoal,
  type PhaseGoal,
} from "@/lib/phase-goals-db"
import {
  listTasks,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  updateTask,
  type Task,
  type TaskStatus,
} from "@/lib/tasks-db"

type View = "list" | "board"

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function TabPhases({ projectId }: { projectId: string }) {
  const [phases, setPhases] = React.useState<Phase[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [goals, setGoals] = React.useState<PhaseGoal[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [view, setView] = React.useState<View>("list")

  const refresh = React.useCallback(async () => {
    try {
      const [p, t] = await Promise.all([
        listPhases(projectId),
        listTasks(projectId),
      ])
      setPhases(p)
      setTasks(t)
      const g = await listGoalsForPhases(p.map((x) => x.id))
      setGoals(g)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [projectId])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  async function handleDeletePhase(id: string) {
    await deletePhase(id)
    setPhases((prev) => prev.filter((p) => p.id !== id))
    setTasks((prev) => prev.filter((t) => t.phaseId !== id))
    setGoals((prev) => prev.filter((g) => g.phaseId !== id))
  }

  async function handlePhaseStatus(phase: Phase, status: TaskStatus) {
    if (phase.status === status) return
    const updated = await updatePhase(phase.id, { status })
    setPhases((prev) => prev.map((p) => (p.id === phase.id ? updated : p)))
  }

  async function handlePhaseDate(
    phase: Phase,
    field: "startDate" | "endDate",
    next: string | null
  ) {
    if (next === (phase[field] ?? null)) return
    const updated = await updatePhase(phase.id, { [field]: next })
    setPhases((prev) => prev.map((p) => (p.id === phase.id ? updated : p)))
  }

  async function handleTaskMove(
    taskId: string,
    newStatus: TaskStatus,
    newPosition: number
  ) {
    setTasks((prev) => {
      const moved = prev.find((t) => t.id === taskId)
      if (!moved) return prev
      const others = prev.filter((t) => t.id !== taskId)
      return [
        ...others,
        { ...moved, status: newStatus, position: newPosition },
      ]
    })
    try {
      await updateTask(taskId, { status: newStatus, position: newPosition })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to move task")
      void refresh()
    }
  }

  // ── Goals ──────────────────────────────────────────────────────────────
  async function handleAddGoal(phaseId: string, text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    const created = await insertPhaseGoal({
      phaseId,
      text: trimmed,
      position: goals.filter((g) => g.phaseId === phaseId).length,
    })
    setGoals((prev) => [...prev, created])
  }

  async function handleToggleGoal(goal: PhaseGoal) {
    const next = !goal.achieved
    setGoals((prev) =>
      prev.map((g) => (g.id === goal.id ? { ...g, achieved: next } : g))
    )
    try {
      await updatePhaseGoal(goal.id, { achieved: next })
    } catch {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goal.id ? { ...g, achieved: goal.achieved } : g
        )
      )
    }
  }

  async function handleRenameGoal(goal: PhaseGoal, text: string) {
    const trimmed = text.trim()
    if (!trimmed || trimmed === goal.text) return
    const updated = await updatePhaseGoal(goal.id, { text: trimmed })
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)))
  }

  async function handleDeleteGoal(id: string) {
    await deletePhaseGoal(id)
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          nativeButton={false}
          render={
            <Link href={`/projects/${projectId}/phases/new`}>
              <Plus />
              Create phase
            </Link>
          }
        />
        <div className="inline-flex items-center rounded-md border bg-card p-0.5">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
          >
            <List />
            List
          </Button>
          <Button
            variant={view === "board" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("board")}
          >
            <KanbanSquare />
            Board
          </Button>
        </div>
      </div>

      {view === "board" ? (
        <KanbanBoard
          projectId={projectId}
          phases={phases}
          tasks={tasks}
          onTaskMove={handleTaskMove}
        />
      ) : phases.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No phases yet. Add one above to start organising the work.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {phases.map((phase) => (
            <PhaseCard
              key={phase.id}
              projectId={projectId}
              phase={phase}
              goals={goals.filter((g) => g.phaseId === phase.id)}
              onDeletePhase={handleDeletePhase}
              onPhaseStatus={handlePhaseStatus}
              onPhaseDate={handlePhaseDate}
              onAddGoal={handleAddGoal}
              onToggleGoal={handleToggleGoal}
              onRenameGoal={handleRenameGoal}
              onDeleteGoal={handleDeleteGoal}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PhaseCard({
  projectId,
  phase,
  goals,
  onDeletePhase,
  onPhaseStatus,
  onPhaseDate,
  onAddGoal,
  onToggleGoal,
  onRenameGoal,
  onDeleteGoal,
}: {
  projectId: string
  phase: Phase
  goals: PhaseGoal[]
  onDeletePhase: (id: string) => void
  onPhaseStatus: (phase: Phase, status: TaskStatus) => void
  onPhaseDate: (
    phase: Phase,
    field: "startDate" | "endDate",
    next: string | null
  ) => void
  onAddGoal: (phaseId: string, text: string) => void
  onToggleGoal: (goal: PhaseGoal) => void
  onRenameGoal: (goal: PhaseGoal, text: string) => void
  onDeleteGoal: (id: string) => void
}) {
  const [expanded, setExpanded] = React.useState(true)
  const [newGoalText, setNewGoalText] = React.useState("")

  const achievedGoals = goals.filter((g) => g.achieved).length

  return (
    <div className="rounded-md border bg-card">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
          <Link
            href={`/projects/${projectId}/phases/${phase.id}`}
            className="font-medium underline-offset-2 hover:underline"
          >
            {phase.name}
          </Link>
          {goals.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {achievedGoals}/{goals.length} goals
            </span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            nativeButton={false}
            render={
              <StatusPill
                tone={TASK_STATUS_TONE[phase.status]}
                dot
                className="cursor-pointer"
              >
                {TASK_STATUS_LABEL[phase.status]}
                <ChevronDown className="size-3" />
              </StatusPill>
            }
          />
          <DropdownMenuContent align="end">
            {TASK_STATUS_ORDER.map((s) => (
              <DropdownMenuItem
                key={s}
                onClick={() => onPhaseStatus(phase, s)}
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
          size="icon-sm"
          nativeButton={false}
          aria-label={`Open ${phase.name}`}
          render={
            <Link href={`/projects/${projectId}/phases/${phase.id}`}>
              <ArrowRight />
            </Link>
          }
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete phase ${phase.name}`}
          onClick={() => onDeletePhase(phase.id)}
        >
          <Trash2 />
        </Button>
      </div>

      {/* Sub-row: inline dates */}
      <div className="flex flex-wrap items-center gap-3 border-t border-dashed px-3 py-1.5 text-xs">
        <CalendarRange className="size-3.5 text-muted-foreground" />
        <DateInline
          label="Start"
          value={phase.startDate}
          onChange={(next) => onPhaseDate(phase, "startDate", next)}
          maxValue={phase.endDate ?? undefined}
        />
        <span className="text-muted-foreground/60">→</span>
        <DateInline
          label="End"
          value={phase.endDate}
          onChange={(next) => onPhaseDate(phase, "endDate", next)}
          minValue={phase.startDate ?? undefined}
        />
      </div>

      {expanded && (
        <div className="flex flex-col gap-4 border-t px-3 py-3">
          {/* Goals */}
          <section className="flex flex-col gap-2">
            <header className="flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Target className="size-3" />
                Goals
              </h3>
              {goals.length > 0 && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {achievedGoals}/{goals.length} achieved
                </span>
              )}
            </header>

            {goals.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                What does success look like for this phase?
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {goals.map((goal) => (
                  <GoalRow
                    key={goal.id}
                    goal={goal}
                    onToggle={() => onToggleGoal(goal)}
                    onRename={(text) => onRenameGoal(goal, text)}
                    onDelete={() => onDeleteGoal(goal.id)}
                  />
                ))}
              </ul>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                onAddGoal(phase.id, newGoalText)
                setNewGoalText("")
              }}
              className="flex items-center gap-2 pt-0.5"
            >
              <Input
                placeholder="Add a goal…"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                className="h-7 text-sm"
              />
              <Button
                type="submit"
                size="xs"
                variant="outline"
                disabled={!newGoalText.trim()}
              >
                <Plus />
                Goal
              </Button>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

// ── Inline editable date ──────────────────────────────────────────────────

function DateInline({
  label,
  value,
  onChange,
  minValue,
  maxValue,
}: {
  label: string
  value: string | null
  onChange: (next: string | null) => void
  minValue?: string
  maxValue?: string
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value ?? "")

  React.useEffect(() => setDraft(value ?? ""), [value])

  if (editing) {
    return (
      <input
        type="date"
        value={draft}
        min={minValue}
        max={maxValue}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const next = draft || null
          onChange(next)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter")
            (e.currentTarget as HTMLInputElement).blur()
          if (e.key === "Escape") {
            setDraft(value ?? "")
            setEditing(false)
          }
        }}
        className="h-6 rounded-sm border border-input bg-background px-1.5 text-xs shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group/date inline-flex items-center gap-1.5 rounded-sm px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
    >
      <span className="uppercase tracking-wider text-[10px] text-muted-foreground/70">
        {label}
      </span>
      <span className={value ? "text-foreground" : "italic text-muted-foreground/60"}>
        {value ? formatDate(value) : "set date"}
      </span>
      <Pencil className="size-2.5 text-muted-foreground/30 transition-colors group-hover/date:text-muted-foreground" />
    </button>
  )
}

// ── Goal row ──────────────────────────────────────────────────────────────

function GoalRow({
  goal,
  onToggle,
  onRename,
  onDelete,
}: {
  goal: PhaseGoal
  onToggle: () => void
  onRename: (text: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(goal.text)
  React.useEffect(() => setDraft(goal.text), [goal.text])

  function commit() {
    setEditing(false)
    if (draft.trim() && draft.trim() !== goal.text) {
      onRename(draft.trim())
    } else {
      setDraft(goal.text)
    }
  }

  return (
    <li className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/40">
      <button
        type="button"
        onClick={onToggle}
        aria-label={goal.achieved ? "Mark not achieved" : "Mark achieved"}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        {goal.achieved ? (
          <CheckSquare className="size-4 text-success" />
        ) : (
          <Square className="size-4" />
        )}
      </button>
      {editing ? (
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") {
              setDraft(goal.text)
              setEditing(false)
            }
          }}
          autoFocus
          className="h-7 flex-1 text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`flex-1 cursor-text text-left text-sm ${
            goal.achieved
              ? "text-muted-foreground line-through"
              : "text-foreground"
          }`}
        >
          {goal.text}
        </button>
      )}
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Delete goal"
        onClick={onDelete}
        className="opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 />
      </Button>
    </li>
  )
}
