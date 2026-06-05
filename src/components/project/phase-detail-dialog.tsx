"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Check, ChevronDown, Plus, Target, Trash2, X } from "lucide-react"

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
import { StatusPill } from "@/components/ui/status-pill"
import {
  deletePhaseGoal,
  insertPhaseGoal,
  listPhaseGoals,
  updatePhaseGoal,
  type PhaseGoal,
} from "@/lib/phase-goals-db"
import { updatePhase, type Phase } from "@/lib/phases-db"
import { TASK_STATUS_TONE, TONE_CLASSES } from "@/lib/status-colors"
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  type TaskStatus,
} from "@/lib/tasks-db"

export function PhaseDetailDialog({
  projectId,
  phase,
  onPhaseChange,
  children,
}: {
  projectId: string
  phase: Phase
  onPhaseChange?: (phase: Phase) => void
  children: React.ReactElement
}) {
  const [open, setOpen] = React.useState(false)
  const [startDate, setStartDate] = React.useState(phase.startDate ?? "")
  const [endDate, setEndDate] = React.useState(phase.endDate ?? "")
  const [savingDates, setSavingDates] = React.useState(false)
  const [dateError, setDateError] = React.useState<string | null>(null)

  const [savingStatus, setSavingStatus] = React.useState(false)

  async function setStatus(next: TaskStatus) {
    if (next === phase.status) return
    setSavingStatus(true)
    try {
      const updated = await updatePhase(phase.id, { status: next })
      onPhaseChange?.(updated)
    } catch {
      // swallow — keep dialog open, dropdown will show prior state
    } finally {
      setSavingStatus(false)
    }
  }

  const [goals, setGoals] = React.useState<PhaseGoal[]>([])
  const [goalsLoading, setGoalsLoading] = React.useState(false)
  const [goalsError, setGoalsError] = React.useState<string | null>(null)
  const [newGoal, setNewGoal] = React.useState("")
  const [addingGoal, setAddingGoal] = React.useState(false)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setStartDate(phase.startDate ?? "")
      setEndDate(phase.endDate ?? "")
      setDateError(null)
      setGoalsError(null)
      setNewGoal("")
      void loadGoals()
    }
  }

  async function loadGoals() {
    setGoalsLoading(true)
    setGoalsError(null)
    try {
      const rows = await listPhaseGoals(phase.id)
      setGoals(rows)
    } catch (e) {
      setGoalsError(e instanceof Error ? e.message : "Failed to load goals")
    } finally {
      setGoalsLoading(false)
    }
  }

  async function saveDates() {
    if (startDate && endDate && endDate < startDate) {
      setDateError("End date can't be before start date.")
      return
    }
    setSavingDates(true)
    setDateError(null)
    try {
      const updated = await updatePhase(phase.id, {
        startDate: startDate || null,
        endDate: endDate || null,
      })
      onPhaseChange?.(updated)
    } catch (e) {
      setDateError(e instanceof Error ? e.message : "Failed to save dates")
    } finally {
      setSavingDates(false)
    }
  }

  async function handleAddGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const text = newGoal.trim()
    if (!text) return
    setAddingGoal(true)
    setGoalsError(null)
    try {
      const next = await insertPhaseGoal({
        phaseId: phase.id,
        text,
        position: goals.length,
      })
      setGoals((prev) => [...prev, next])
      setNewGoal("")
    } catch (e) {
      setGoalsError(e instanceof Error ? e.message : "Failed to add goal")
    } finally {
      setAddingGoal(false)
    }
  }

  async function toggleGoal(goal: PhaseGoal) {
    const before = goals
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id ? { ...g, achieved: !g.achieved } : g
      )
    )
    try {
      await updatePhaseGoal(goal.id, { achieved: !goal.achieved })
    } catch (e) {
      setGoals(before)
      setGoalsError(e instanceof Error ? e.message : "Failed to update goal")
    }
  }

  async function removeGoal(goal: PhaseGoal) {
    const before = goals
    setGoals((prev) => prev.filter((g) => g.id !== goal.id))
    try {
      await deletePhaseGoal(goal.id)
    } catch (e) {
      setGoals(before)
      setGoalsError(e instanceof Error ? e.message : "Failed to delete goal")
    }
  }

  const datesDirty =
    (startDate || "") !== (phase.startDate ?? "") ||
    (endDate || "") !== (phase.endDate ?? "")

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {phase.name}
            <DropdownMenu>
              <DropdownMenuTrigger
                nativeButton={false}
                render={
                  <StatusPill
                    tone={TASK_STATUS_TONE[phase.status]}
                    dot
                    size="sm"
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
                    onClick={() => void setStatus(s)}
                    disabled={savingStatus}
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
          </DialogTitle>
          <DialogDescription>
            Goals, dates, and quick jump to tasks for this phase.
          </DialogDescription>
        </DialogHeader>

        <section className="grid gap-4">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="phase-start" className="text-xs">
                Start date
              </Label>
              <Input
                id="phase-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phase-end" className="text-xs">
                End date
              </Label>
              <Input
                id="phase-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          {dateError && (
            <p className="text-xs text-destructive">{dateError}</p>
          )}
          {datesDirty && (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => void saveDates()}
                disabled={savingDates}
              >
                <Check />
                {savingDates ? "Saving…" : "Save dates"}
              </Button>
            </div>
          )}

          {/* Goals */}
          <div className="grid gap-2">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Target className="size-3.5" />
              Goals
              <span className="text-foreground/70">({goals.length})</span>
            </div>

            {goalsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No goals yet — add the first one below.
              </p>
            ) : (
              <ul className="grid gap-1.5">
                {goals.map((goal) => (
                  <li
                    key={goal.id}
                    className="group flex items-start gap-2 rounded-md border bg-background/40 px-2.5 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => void toggleGoal(goal)}
                      className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded border transition-colors ${
                        goal.achieved
                          ? "border-success bg-success text-success-foreground"
                          : "border-border hover:border-foreground/50"
                      }`}
                      aria-label={
                        goal.achieved ? "Mark as not done" : "Mark as done"
                      }
                    >
                      {goal.achieved && <Check className="size-3" />}
                    </button>
                    <span
                      className={`flex-1 text-sm leading-snug ${
                        goal.achieved
                          ? "text-muted-foreground line-through"
                          : ""
                      }`}
                    >
                      {goal.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => void removeGoal(goal)}
                      className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-60"
                      aria-label="Delete goal"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleAddGoal} className="flex items-center gap-2">
              <Input
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Add a goal…"
                className="h-8"
              />
              <Button
                type="submit"
                size="sm"
                disabled={addingGoal || !newGoal.trim()}
              >
                <Plus />
                Add
              </Button>
            </form>

            {goalsError && (
              <p className="text-xs text-destructive">{goalsError}</p>
            )}
          </div>
        </section>

        <DialogFooter className="sm:justify-between">
          <DialogClose
            render={
              <Button variant="outline" type="button">
                <X />
                Close
              </Button>
            }
          />
          <Button
            type="button"
            render={
              <Link
                href={`/projects/${projectId}/phases/${phase.id}`}
                onClick={() => setOpen(false)}
              >
                Open phase tasks
                <ArrowRight />
              </Link>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
