"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Clock,
  Info,
  MessageSquare,
  Package,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react"

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
import { Textarea } from "@/components/ui/textarea"
import { TaskAttachments } from "@/components/project/task-attachments"
import { TaskChecklist } from "@/components/project/task-checklist"
import { TaskTags } from "@/components/project/task-tags"
import { TaskThread } from "@/components/project/task-thread"
import type { Phase } from "@/lib/phases-db"
import type { Project } from "@/lib/projects-context"
import {
  phaseToneFor,
  TASK_PRIORITY_TONE,
  TASK_STATUS_TONE,
  TONE_CLASSES,
} from "@/lib/status-colors"
import {
  deleteTask,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  updateTask,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks-db"

function timeLeft(due: string | null, status: TaskStatus): {
  text: string
  tone: "neutral" | "warning" | "destructive" | "success"
} {
  if (status === "completed") return { text: "Completed", tone: "success" }
  if (!due) return { text: "No deadline", tone: "neutral" }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(due + "T00:00:00")
  const diffMs = target.getTime() - today.getTime()
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (days < 0) {
    const abs = Math.abs(days)
    return {
      text: `${abs} day${abs === 1 ? "" : "s"} overdue`,
      tone: "destructive",
    }
  }
  if (days === 0) return { text: "Due today", tone: "warning" }
  if (days <= 2) return { text: `${days} day${days === 1 ? "" : "s"} left`, tone: "warning" }
  return { text: `${days} days left`, tone: "neutral" }
}

export function TaskDetail({
  project,
  task: initialTask,
  phases,
}: {
  project: Project
  task: Task
  phases: Phase[]
}) {
  const router = useRouter()
  const [task, setTask] = React.useState<Task>(initialTask)
  const [title, setTitle] = React.useState(initialTask.title)
  const [description, setDescription] = React.useState(
    initialTask.description ?? ""
  )
  const [assignee, setAssignee] = React.useState(initialTask.assignee ?? "")
  const [startDate, setStartDate] = React.useState(initialTask.startDate ?? "")
  const [dueDate, setDueDate] = React.useState(initialTask.dueDate ?? "")
  const [estimated, setEstimated] = React.useState(
    initialTask.estimatedHours !== null
      ? String(initialTask.estimatedHours)
      : ""
  )
  const [actual, setActual] = React.useState(
    initialTask.actualHours !== null ? String(initialTask.actualHours) : ""
  )
  const [branch, setBranch] = React.useState(initialTask.branchName ?? "")
  const [target, setTarget] = React.useState(initialTask.prTargetBranch ?? "")
  const [prUrl, setPrUrl] = React.useState(initialTask.prUrl ?? "")
  const [savingField, setSavingField] = React.useState<string | null>(null)

  const phaseName = task.phaseId
    ? phases.find((p) => p.id === task.phaseId)?.name ?? null
    : null
  const statusTone = TASK_STATUS_TONE[task.status]
  const statusPalette = TONE_CLASSES[statusTone]
  const priorityTone = TASK_PRIORITY_TONE[task.priority]
  const phaseTone = phaseToneFor(task.phaseId)
  const phasePalette = TONE_CLASSES[phaseTone]
  const timeLeftInfo = timeLeft(task.dueDate, task.status)

  async function commit(field: string, patch: Partial<Task>) {
    setSavingField(field)
    try {
      const updated = await updateTask(task.id, patch)
      setTask(updated)
    } finally {
      setSavingField(null)
    }
  }

  async function handleStatus(s: TaskStatus) {
    if (s === task.status) return
    await commit("status", { status: s })
  }

  async function handlePriority(p: TaskPriority) {
    if (p === task.priority) return
    await commit("priority", { priority: p })
  }

  async function handlePhase(phaseId: string | null) {
    if (phaseId === task.phaseId) return
    await commit("phaseId", { phaseId })
  }

  async function commitHours(
    field: "estimatedHours" | "actualHours",
    current: number | null,
    raw: string
  ) {
    const trimmed = raw.trim()
    const next = trimmed === "" ? null : Number(trimmed)
    if (next !== null && !Number.isFinite(next)) return
    if (next === current) return
    await commit(field, { [field]: next })
  }

  async function handleDelete() {
    if (!confirm("Delete this task? This can't be undone.")) return
    await deleteTask(task.id)
    router.push(`/projects/${project.id}`)
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <Link href={`/projects/${project.id}`}>
              <ArrowLeft />
              {project.projectName}
            </Link>
          }
        />
        {phaseName && (
          <>
            <span className="text-border">/</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${phasePalette.soft}`}
            >
              <span className={`size-1.5 rounded-full ${phasePalette.dot}`} />
              {phaseName}
            </span>
          </>
        )}
      </nav>

      {/* ── Page header (always visible above accordions) ─────────── */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6">
        <span
          aria-hidden
          className={`absolute -top-24 -right-24 size-72 rounded-full opacity-20 blur-3xl ${statusPalette.dot}`}
        />
        <span
          aria-hidden
          className={`absolute inset-y-0 left-0 w-1 ${statusPalette.dot}`}
        />
        <Button
          variant="destructive"
          size="icon-sm"
          aria-label="Delete task"
          onClick={handleDelete}
          className="absolute right-4 top-4 z-10"
        >
          <Trash2 />
        </Button>
        <div className="relative flex flex-col gap-3 pr-14">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StatusPill tone={statusTone} dot size="md">
              {TASK_STATUS_LABEL[task.status]}
            </StatusPill>
            <StatusPill tone={priorityTone} dot size="md">
              {TASK_PRIORITY_LABEL[task.priority]} priority
            </StatusPill>
            <StatusPill tone={timeLeftInfo.tone} size="md">
              <Clock className="size-3" />
              {timeLeftInfo.text}
            </StatusPill>
            {task.source === "fathom" && (
              <StatusPill tone="primary" size="md">
                <Sparkles className="size-3" />
                Extracted by AI
              </StatusPill>
            )}
            {savingField && (
              <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-info">
                Saving…
              </span>
            )}
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim() && title.trim() !== task.title) {
                void commit("title", { title: title.trim() })
              } else {
                setTitle(task.title)
              }
            }}
            className="h-auto border-transparent bg-transparent px-0 text-2xl font-semibold tracking-tight shadow-none focus-visible:border-transparent md:text-3xl"
            placeholder="Task title"
          />
          <p className="text-[11px] text-muted-foreground">
            Created {new Date(task.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* ── Accordions ─────────────────────────────────────────────── */}
      <Accordion defaultValue={["info"]}>
        {/* Section 1: Task info (default open) */}
        <AccordionItem value="info">
          <AccordionTrigger>
            <Info className="size-4 text-muted-foreground" />
            <span>Task info</span>
          </AccordionTrigger>
          <AccordionPanel>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="task-description">Description</Label>
                <Textarea
                  id="task-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => {
                    const next = description.trim() || null
                    if (next !== (task.description ?? null)) {
                      void commit("description", { description: next })
                    }
                  }}
                  rows={5}
                  placeholder="What needs to be built, acceptance criteria, edge cases…"
                />
              </div>

              {/* Grouped, click-to-edit metadata bands */}
              <MetaGroup title="Assignment">
                <DropdownRow
                  label="Stage"
                  display={
                    <StatusPill tone={statusTone} dot variant="soft" size="sm">
                      {TASK_STATUS_LABEL[task.status]}
                    </StatusPill>
                  }
                >
                  {TASK_STATUS_ORDER.map((s) => {
                    const t = TASK_STATUS_TONE[s]
                    return (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => handleStatus(s)}
                        className="gap-2"
                      >
                        <span className={`size-2 rounded-full ${TONE_CLASSES[t].dot}`} />
                        {TASK_STATUS_LABEL[s]}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownRow>
                <DropdownRow
                  label="Priority"
                  display={
                    <StatusPill tone={priorityTone} dot variant="soft" size="sm">
                      {TASK_PRIORITY_LABEL[task.priority]}
                    </StatusPill>
                  }
                >
                  {TASK_PRIORITY_ORDER.map((p) => {
                    const t = TASK_PRIORITY_TONE[p]
                    return (
                      <DropdownMenuItem
                        key={p}
                        onClick={() => handlePriority(p)}
                        className="gap-2"
                      >
                        <span className={`size-2 rounded-full ${TONE_CLASSES[t].dot}`} />
                        {TASK_PRIORITY_LABEL[p]}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownRow>
                <DropdownRow
                  label="Phase"
                  display={
                    phaseName ? (
                      <span className="text-sm">{phaseName}</span>
                    ) : (
                      <EmptyValue>Unassigned</EmptyValue>
                    )
                  }
                >
                  <DropdownMenuItem onClick={() => handlePhase(null)}>
                    Unassigned
                  </DropdownMenuItem>
                  {phases.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => handlePhase(p.id)}
                    >
                      {p.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownRow>
                <EditableRow
                  label="Assignee"
                  value={assignee}
                  onChange={setAssignee}
                  displayValue={task.assignee}
                  placeholder="Name"
                  onCommit={() => {
                    const next = assignee.trim() || null
                    if (next !== (task.assignee ?? null)) {
                      void commit("assignee", { assignee: next })
                    }
                  }}
                />
              </MetaGroup>

              <MetaGroup title="Schedule">
                <EditableRow
                  label="Start"
                  value={startDate}
                  onChange={setStartDate}
                  displayValue={task.startDate ? formatDate(task.startDate) : null}
                  type="date"
                  placeholder="Pick a date"
                  onCommit={() => {
                    const next = startDate || null
                    if (next !== (task.startDate ?? null)) {
                      void commit("startDate", { startDate: next })
                    }
                  }}
                />
                <EditableRow
                  label="End"
                  value={dueDate}
                  onChange={setDueDate}
                  displayValue={task.dueDate ? formatDate(task.dueDate) : null}
                  type="date"
                  placeholder="Pick a date"
                  onCommit={() => {
                    const next = dueDate || null
                    if (next !== (task.dueDate ?? null)) {
                      void commit("dueDate", { dueDate: next })
                    }
                  }}
                />
                <EditableRow
                  label="Estimate"
                  value={estimated}
                  onChange={setEstimated}
                  displayValue={task.estimatedHours !== null ? `${task.estimatedHours}h` : null}
                  type="number"
                  placeholder="0h"
                  inputSuffix="h"
                  onCommit={() =>
                    commitHours("estimatedHours", task.estimatedHours, estimated)
                  }
                />
                <EditableRow
                  label="Actual"
                  value={actual}
                  onChange={setActual}
                  displayValue={task.actualHours !== null ? `${task.actualHours}h` : null}
                  type="number"
                  placeholder="0h"
                  inputSuffix="h"
                  onCommit={() =>
                    commitHours("actualHours", task.actualHours, actual)
                  }
                />
              </MetaGroup>

              <MetaGroup title="Git">
                <EditableRow
                  label="Branch"
                  value={branch}
                  onChange={setBranch}
                  displayValue={task.branchName}
                  placeholder="feature/…"
                  mono
                  onCommit={() => {
                    const next = branch.trim() || null
                    if (next !== (task.branchName ?? null)) {
                      void commit("branchName", { branchName: next })
                    }
                  }}
                />
                <EditableRow
                  label="PR target"
                  value={target}
                  onChange={setTarget}
                  displayValue={task.prTargetBranch}
                  placeholder="main"
                  mono
                  onCommit={() => {
                    const next = target.trim() || null
                    if (next !== (task.prTargetBranch ?? null)) {
                      void commit("prTargetBranch", { prTargetBranch: next })
                    }
                  }}
                />
              </MetaGroup>

              <TaskTags projectId={project.id} taskId={task.id} />

              <TaskChecklist taskId={task.id} />
            </div>
          </AccordionPanel>
        </AccordionItem>

        {/* Section 2: Task material */}
        <AccordionItem value="material">
          <AccordionTrigger>
            <Package className="size-4 text-muted-foreground" />
            <span>Task material</span>
          </AccordionTrigger>
          <AccordionPanel>
            <div className="flex flex-col gap-5">
              {/* PR link, surfaced as a primary link card */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="task-pr-url"
                  className="text-[11px] uppercase tracking-wider text-muted-foreground"
                >
                  Pull request link
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="task-pr-url"
                    value={prUrl}
                    onChange={(e) => setPrUrl(e.target.value)}
                    onBlur={() => {
                      const next = prUrl.trim() || null
                      if (next !== (task.prUrl ?? null)) {
                        void commit("prUrl", { prUrl: next })
                      }
                    }}
                    placeholder="https://github.com/org/repo/pull/123"
                    type="url"
                    className="text-sm"
                  />
                  {task.prUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={
                        <a href={task.prUrl} target="_blank" rel="noreferrer">
                          Open PR
                        </a>
                      }
                    />
                  )}
                </div>
              </div>

              <TaskAttachments taskId={task.id} />
            </div>
          </AccordionPanel>
        </AccordionItem>

        {/* Section 3: Thread */}
        <AccordionItem value="thread">
          <AccordionTrigger>
            <MessageSquare className="size-4 text-muted-foreground" />
            <span>Thread</span>
          </AccordionTrigger>
          <AccordionPanel>
            <TaskThread taskId={task.id} />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function MetaGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h3>
      <div className="divide-y rounded-lg border bg-background/30">
        {children}
      </div>
    </div>
  )
}

function EmptyValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm italic text-muted-foreground/60">{children}</span>
  )
}

function MetaRowShell({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[100px_1fr_auto] items-center gap-3 px-3 py-2 sm:grid-cols-[120px_1fr_auto]">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  )
}

function DropdownRow({
  label,
  display,
  children,
}: {
  label: string
  display: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="group/row grid w-full grid-cols-[100px_1fr_auto] items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:grid-cols-[120px_1fr_auto]"
          >
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <span className="min-w-0 truncate text-sm">{display}</span>
            <Pencil className="size-3 text-muted-foreground/30 transition-colors group-hover/row:text-muted-foreground" />
          </button>
        }
      />
      <DropdownMenuContent>{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}

function EditableRow({
  label,
  value,
  onChange,
  onCommit,
  displayValue,
  placeholder,
  type = "text",
  mono,
  inputSuffix,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onCommit: () => void
  displayValue: string | null
  placeholder?: string
  type?: "text" | "date" | "number"
  mono?: boolean
  inputSuffix?: string
}) {
  const [editing, setEditing] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (editing) {
    return (
      <MetaRowShell label={label}>
        <div className="relative col-span-2">
          <input
            ref={inputRef}
            type={type}
            inputMode={type === "number" ? "decimal" : undefined}
            step={type === "number" ? "0.25" : undefined}
            min={type === "number" ? "0" : undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => {
              onCommit()
              setEditing(false)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur()
              if (e.key === "Escape") setEditing(false)
            }}
            placeholder={placeholder}
            className={`h-7 w-full rounded-md border border-input bg-background px-2 ${
              inputSuffix ? "pr-6" : ""
            } text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 ${
              mono ? "font-mono text-xs" : ""
            }`}
          />
          {inputSuffix && (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
              {inputSuffix}
            </span>
          )}
        </div>
      </MetaRowShell>
    )
  }

  const hasValue = displayValue && displayValue.length > 0

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group/row grid w-full grid-cols-[100px_1fr_auto] items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:grid-cols-[120px_1fr_auto]"
    >
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={`min-w-0 truncate text-sm ${mono ? "font-mono text-xs" : ""}`}
      >
        {hasValue ? (
          displayValue
        ) : (
          <EmptyValue>{placeholder ?? "—"}</EmptyValue>
        )}
      </span>
      <Pencil className="size-3 text-muted-foreground/30 transition-colors group-hover/row:text-muted-foreground" />
    </button>
  )
}
