"use client"

import * as React from "react"
import Link from "next/link"
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AnimatePresence, motion } from "motion/react"
import {
  ChevronDown,
  GripVertical,
  Inbox,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/ui/status-pill"
import {
  TASK_PRIORITY_TONE,
  TASK_STATUS_TONE,
  TONE_CLASSES,
} from "@/lib/status-colors"
import { listPhases, type Phase } from "@/lib/phases-db"
import {
  listTasks,
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_ORDER,
  TASK_PRIORITY_RANK,
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  updateTask,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks-db"
import {
  deleteTodayPick,
  insertTodayPick,
  isoToday,
  listTodayPicks,
  reorderTodayPicks,
  type TodayPick,
} from "@/lib/today-db"

const TODAY_CONTAINER = "today"
const BACKLOG_CONTAINER = "backlog"
const NO_PHASE_KEY = "__none__"
const SPRING_SNAP = { type: "spring", stiffness: 520, damping: 34 } as const
const SPRING_POP = { type: "spring", stiffness: 380, damping: 22 } as const

const STATUS_FILTERS: TaskStatus[] = ["not_started", "in_progress", "in_review"]
const PRIORITY_FILTERS: TaskPriority[] = TASK_PRIORITY_ORDER

const backlogDragId = (taskId: string) => `bl:${taskId}`
const todayDragId = (pickId: string) => `td:${pickId}`
const parseDragId = (id: string) => {
  if (id.startsWith("bl:")) return { kind: "backlog" as const, id: id.slice(3) }
  if (id.startsWith("td:")) return { kind: "today" as const, id: id.slice(3) }
  return null
}

export function TabToday({ projectId }: { projectId: string }) {
  const today = isoToday()
  const [phases, setPhases] = React.useState<Phase[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [picks, setPicks] = React.useState<TodayPick[]>([])
  const [loading, setLoading] = React.useState(true)
  const [note, setNote] = React.useState("")
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null)
  const [phaseFilter, setPhaseFilter] = React.useState<Set<string> | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<Set<TaskStatus>>(
    new Set(STATUS_FILTERS)
  )
  const [priorityFilter, setPriorityFilter] = React.useState<Set<TaskPriority>>(
    new Set(PRIORITY_FILTERS)
  )

  React.useEffect(() => {
    Promise.all([
      listPhases(projectId),
      listTasks(projectId),
      listTodayPicks(projectId, today),
    ]).then(([p, t, pi]) => {
      setPhases(p)
      setTasks(t)
      setPicks(pi)
      setPhaseFilter(new Set([...p.map((x) => x.id), NO_PHASE_KEY]))
      setLoading(false)
    })
  }, [projectId, today])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )

  const tasksById = React.useMemo(
    () => new Map(tasks.map((t) => [t.id, t])),
    [tasks]
  )
  const phasesById = React.useMemo(
    () => new Map(phases.map((p) => [p.id, p])),
    [phases]
  )
  const pickedTaskIds = React.useMemo(
    () => new Set(picks.map((p) => p.taskId).filter((id): id is string => !!id)),
    [picks]
  )

  const candidateTasks = React.useMemo(
    () =>
      tasks
        .filter((t) => t.status !== "completed" && !pickedTaskIds.has(t.id))
        .sort(
          (a, b) =>
            TASK_PRIORITY_RANK[a.priority] - TASK_PRIORITY_RANK[b.priority] ||
            a.position - b.position
        ),
    [tasks, pickedTaskIds]
  )

  const filteredBacklog = React.useMemo(() => {
    if (!phaseFilter) return candidateTasks
    return candidateTasks.filter((t) => {
      const phaseKey = t.phaseId ?? NO_PHASE_KEY
      return (
        phaseFilter.has(phaseKey) &&
        statusFilter.has(t.status) &&
        priorityFilter.has(t.priority)
      )
    })
  }, [candidateTasks, phaseFilter, statusFilter, priorityFilter])

  async function handlePickTask(taskId: string, atIndex?: number) {
    const insertAt = atIndex ?? picks.length
    const created = await insertTodayPick({
      projectId,
      taskId,
      position: insertAt,
    })
    const next = [...picks.slice(0, insertAt), created, ...picks.slice(insertAt)]
    setPicks(next)
    if (insertAt < picks.length) {
      await reorderTodayPicks(next.map((p) => p.id))
    }
  }

  async function handleAddNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!note.trim()) return
    const created = await insertTodayPick({
      projectId,
      note: note.trim(),
      position: picks.length,
    })
    setPicks((prev) => [...prev, created])
    setNote("")
  }

  async function handleRemovePick(id: string) {
    setPicks((prev) => prev.filter((p) => p.id !== id))
    await deleteTodayPick(id)
  }

  async function handleTaskStatus(task: Task, status: TaskStatus) {
    if (task.status === status) return
    const updated = await updateTask(task.id, { status })
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
  }

  function findContainerOf(dragId: string): string | null {
    if (dragId === TODAY_CONTAINER || dragId === BACKLOG_CONTAINER) return dragId
    const parsed = parseDragId(dragId)
    if (!parsed) return null
    return parsed.kind === "today" ? TODAY_CONTAINER : BACKLOG_CONTAINER
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDragId(null)
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const activeParsed = parseDragId(activeId)
    if (!activeParsed) return
    const overContainer = findContainerOf(overId)
    if (!overContainer) return

    if (activeParsed.kind === "backlog" && overContainer === TODAY_CONTAINER) {
      let insertIndex = picks.length
      if (overId !== TODAY_CONTAINER) {
        const overParsed = parseDragId(overId)
        if (overParsed?.kind === "today") {
          const idx = picks.findIndex((p) => p.id === overParsed.id)
          if (idx >= 0) insertIndex = idx
        }
      }
      await handlePickTask(activeParsed.id, insertIndex)
      return
    }

    if (activeParsed.kind === "today" && overContainer === BACKLOG_CONTAINER) {
      await handleRemovePick(activeParsed.id)
      return
    }

    if (activeParsed.kind === "today" && overContainer === TODAY_CONTAINER) {
      const fromIdx = picks.findIndex((p) => p.id === activeParsed.id)
      if (fromIdx < 0) return
      let toIdx = picks.length - 1
      if (overId !== TODAY_CONTAINER) {
        const overParsed = parseDragId(overId)
        if (overParsed?.kind === "today") {
          const idx = picks.findIndex((p) => p.id === overParsed.id)
          if (idx >= 0) toIdx = idx
        }
      }
      if (fromIdx === toIdx) return
      const next = arrayMove(picks, fromIdx, toIdx)
      setPicks(next)
      await reorderTodayPicks(next.map((p) => p.id))
    }
  }

  function togglePhase(key: string) {
    setPhaseFilter((prev) => {
      const base = prev ?? new Set([...phases.map((p) => p.id), NO_PHASE_KEY])
      const next = new Set(base)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  function toggleStatus(s: TaskStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }
  function togglePriority(p: TaskPriority) {
    setPriorityFilter((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }
  function resetFilters() {
    setPhaseFilter(new Set([...phases.map((p) => p.id), NO_PHASE_KEY]))
    setStatusFilter(new Set(STATUS_FILTERS))
    setPriorityFilter(new Set(PRIORITY_FILTERS))
  }
  const filtersActive =
    (phaseFilter &&
      phaseFilter.size !== phases.length + 1) ||
    statusFilter.size !== STATUS_FILTERS.length ||
    priorityFilter.size !== PRIORITY_FILTERS.length

  if (loading) {
    return <Skeleton className="h-40 w-full" />
  }

  const activeParsed = activeDragId ? parseDragId(activeDragId) : null
  const activeBacklogTask =
    activeParsed?.kind === "backlog" ? tasksById.get(activeParsed.id) ?? null : null
  const activeTodayPick =
    activeParsed?.kind === "today"
      ? picks.find((p) => p.id === activeParsed.id) ?? null
      : null
  const activeTodayTask = activeTodayPick?.taskId
    ? tasksById.get(activeTodayPick.taskId) ?? null
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
        {/* ─── Today (left) — focused, primary-accented panel ────── */}
        <section className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] via-card/80 to-card/50 p-5 shadow-lg shadow-primary/5 backdrop-blur-sm">
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          />
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary">
                <Sparkles className="size-3.5" />
              </span>
              <div className="flex flex-col leading-tight">
                <h2 className="text-sm font-semibold tracking-tight">Today</h2>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {picks.length} {picks.length === 1 ? "item" : "items"}
                </span>
              </div>
            </div>
            <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {new Intl.DateTimeFormat("en", {
                weekday: "long",
                month: "short",
                day: "numeric",
              }).format(new Date())}
            </span>
          </header>

          <TodayDropZone
            picks={picks}
            tasksById={tasksById}
            phasesById={phasesById}
            projectId={projectId}
            onRemove={handleRemovePick}
            onTaskStatus={handleTaskStatus}
          />

          <form onSubmit={handleAddNote} className="flex gap-2">
            <Input
              placeholder="Add a freeform note for today…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" variant="secondary" disabled={!note.trim()}>
              <Plus />
              Note
            </Button>
          </form>
        </section>

        {/* ─── Backlog (right) — neutral library panel ──────────── */}
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/20 p-5">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-md bg-muted text-muted-foreground">
                <Inbox className="size-3.5" />
              </span>
              <div className="flex flex-col leading-tight">
                <h2 className="text-sm font-semibold tracking-tight">Backlog</h2>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  source
                </span>
              </div>
            </div>
            <motion.span
              key={filteredBacklog.length}
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING_SNAP}
              className="rounded-full border bg-card px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground"
            >
              {filteredBacklog.length} of {candidateTasks.length}
            </motion.span>
          </header>

          <FilterBar
            phases={phases}
            phaseFilter={phaseFilter}
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            togglePhase={togglePhase}
            toggleStatus={toggleStatus}
            togglePriority={togglePriority}
            filtersActive={Boolean(filtersActive)}
            resetFilters={resetFilters}
          />

          <BacklogDropZone
            tasks={filteredBacklog}
            phasesById={phasesById}
            projectId={projectId}
            onPick={(id) => handlePickTask(id)}
          />
        </section>
      </div>

      <DragOverlay zIndex={50} dropAnimation={null}>
        {activeBacklogTask ? (
          <motion.div
            initial={{ scale: 1, rotate: 0 }}
            animate={{ scale: 1.06, rotate: 1.5 }}
            transition={SPRING_POP}
            className="origin-center"
          >
            <BacklogRowInner
              task={activeBacklogTask}
              phaseName={
                activeBacklogTask.phaseId
                  ? phasesById.get(activeBacklogTask.phaseId)?.name ?? null
                  : null
              }
              projectId={activeBacklogTask.projectId}
              dragging
            />
          </motion.div>
        ) : null}
        {activeTodayPick ? (
          <motion.div
            initial={{ scale: 1, rotate: 0 }}
            animate={{ scale: 1.06, rotate: 1.5 }}
            transition={SPRING_POP}
            className="origin-center"
          >
            <TodayRowInner
              pick={activeTodayPick}
              task={activeTodayTask}
              phasesById={phasesById}
              projectId={projectId}
              dragging
            />
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Filter bar — Linear-style dropdown popovers
 * ────────────────────────────────────────────────────────────────── */
function FilterBar({
  phases,
  phaseFilter,
  statusFilter,
  priorityFilter,
  togglePhase,
  toggleStatus,
  togglePriority,
  filtersActive,
  resetFilters,
}: {
  phases: Phase[]
  phaseFilter: Set<string> | null
  statusFilter: Set<TaskStatus>
  priorityFilter: Set<TaskPriority>
  togglePhase: (key: string) => void
  toggleStatus: (s: TaskStatus) => void
  togglePriority: (p: TaskPriority) => void
  filtersActive: boolean
  resetFilters: () => void
}) {
  const totalPhases = phases.length + 1 // +1 for "No phase"
  const phaseSelected = phaseFilter?.size ?? totalPhases
  const phaseActive = phaseSelected < totalPhases
  const statusActive = statusFilter.size < STATUS_FILTERS.length
  const priorityActive = priorityFilter.size < PRIORITY_FILTERS.length

  return (
    <motion.div
      layout
      transition={SPRING_SNAP}
      className="flex flex-wrap items-center gap-1.5"
    >
      <FacetButton
        label="Phase"
        active={phaseActive}
        count={phaseActive ? phaseSelected : undefined}
        total={totalPhases}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Phase
          </DropdownMenuLabel>
          {phases.map((p) => (
            <DropdownMenuCheckboxItem
              key={p.id}
              checked={phaseFilter?.has(p.id) ?? true}
              onCheckedChange={() => togglePhase(p.id)}
              closeOnClick={false}
            >
              <span className={`size-2 rounded-full ${TONE_CLASSES.primary.dot}`} />
              {p.name}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuCheckboxItem
            checked={phaseFilter?.has(NO_PHASE_KEY) ?? true}
            onCheckedChange={() => togglePhase(NO_PHASE_KEY)}
            closeOnClick={false}
          >
            <span className={`size-2 rounded-full ${TONE_CLASSES.neutral.dot}`} />
            No phase
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </FacetButton>

      <FacetButton
        label="Status"
        active={statusActive}
        count={statusActive ? statusFilter.size : undefined}
        total={STATUS_FILTERS.length}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </DropdownMenuLabel>
          {STATUS_FILTERS.map((s) => (
            <DropdownMenuCheckboxItem
              key={s}
              checked={statusFilter.has(s)}
              onCheckedChange={() => toggleStatus(s)}
              closeOnClick={false}
            >
              <span
                className={`size-2 rounded-full ${TONE_CLASSES[TASK_STATUS_TONE[s]].dot}`}
              />
              {TASK_STATUS_LABEL[s]}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </FacetButton>

      <FacetButton
        label="Priority"
        active={priorityActive}
        count={priorityActive ? priorityFilter.size : undefined}
        total={PRIORITY_FILTERS.length}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Priority
          </DropdownMenuLabel>
          {PRIORITY_FILTERS.map((p) => (
            <DropdownMenuCheckboxItem
              key={p}
              checked={priorityFilter.has(p)}
              onCheckedChange={() => togglePriority(p)}
              closeOnClick={false}
            >
              <span
                className={`size-2 rounded-full ${TONE_CLASSES[TASK_PRIORITY_TONE[p]].dot}`}
              />
              {TASK_PRIORITY_LABEL[p]}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </FacetButton>

      <AnimatePresence>
        {filtersActive && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85, x: -4 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: -4 }}
            transition={SPRING_POP}
            onClick={resetFilters}
            className="ml-auto inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3" />
            Clear
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function FacetButton({
  label,
  active,
  count,
  total,
  children,
}: {
  label: string
  active: boolean
  count?: number
  total: number
  children: React.ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            transition={SPRING_POP}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors ${
              active
                ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-border bg-transparent text-foreground hover:bg-muted"
            }`}
          >
            {label}
            {active && count !== undefined && (
              <span className="inline-flex items-center justify-center rounded-sm bg-primary/20 px-1 text-[10px] font-semibold tabular-nums">
                {count}/{total}
              </span>
            )}
            <ChevronDown className="size-3 opacity-60" />
          </motion.button>
        }
      />
      <DropdownMenuContent align="start" className="min-w-44">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Today drop zone
 * ────────────────────────────────────────────────────────────────── */
function TodayDropZone({
  picks,
  tasksById,
  phasesById,
  projectId,
  onRemove,
  onTaskStatus,
}: {
  picks: TodayPick[]
  tasksById: Map<string, Task>
  phasesById: Map<string, Phase>
  projectId: string
  onRemove: (id: string) => void
  onTaskStatus: (task: Task, status: TaskStatus) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: TODAY_CONTAINER })

  return (
    <SortableContext
      items={picks.map((p) => todayDragId(p.id))}
      strategy={verticalListSortingStrategy}
    >
      <motion.ul
        ref={setNodeRef}
        layout
        animate={{
          scale: isOver ? 1.01 : 1,
        }}
        transition={SPRING_SNAP}
        className={`flex min-h-32 flex-col gap-2 rounded-xl p-1 transition-colors ${
          isOver ? "bg-primary/10 ring-2 ring-primary/40" : "ring-0"
        }`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {picks.length === 0 ? (
            <motion.li
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={SPRING_SNAP}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-primary/20 bg-primary/[0.03] px-6 py-10 text-center"
            >
              <Sparkles className="size-5 text-primary/50" />
              <span className="text-sm text-muted-foreground">
                Drop a task here to plan your day
              </span>
              <span className="text-[11px] text-muted-foreground/70">
                or add a freeform note below
              </span>
            </motion.li>
          ) : (
            picks.map((pick) => {
              const task = pick.taskId ? tasksById.get(pick.taskId) ?? null : null
              return (
                <SortableTodayRow
                  key={pick.id}
                  pick={pick}
                  task={task}
                  phasesById={phasesById}
                  projectId={projectId}
                  onRemove={onRemove}
                  onTaskStatus={onTaskStatus}
                />
              )
            })
          )}
        </AnimatePresence>
      </motion.ul>
    </SortableContext>
  )
}

function SortableTodayRow({
  pick,
  task,
  phasesById,
  projectId,
  onRemove,
  onTaskStatus,
}: {
  pick: TodayPick
  task: Task | null
  phasesById: Map<string, Phase>
  projectId: string
  onRemove: (id: string) => void
  onTaskStatus: (task: Task, status: TaskStatus) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todayDragId(pick.id) })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <motion.li
      ref={setNodeRef}
      style={style}
      layout="position"
      initial={{ opacity: 0, scale: 0.92, y: -6 }}
      animate={{ opacity: isDragging ? 0.25 : 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: 12 }}
      transition={SPRING_POP}
      {...attributes}
      {...listeners}
      className="cursor-grab touch-none active:cursor-grabbing"
    >
      <TodayRowInner
        pick={pick}
        task={task}
        phasesById={phasesById}
        projectId={projectId}
        onRemove={onRemove}
        onTaskStatus={onTaskStatus}
      />
    </motion.li>
  )
}

function TodayRowInner({
  pick,
  task,
  phasesById,
  projectId,
  dragging,
  onRemove,
  onTaskStatus,
}: {
  pick: TodayPick
  task: Task | null
  phasesById: Map<string, Phase>
  projectId: string
  dragging?: boolean
  onRemove?: (id: string) => void
  onTaskStatus?: (task: Task, status: TaskStatus) => void
}) {
  const priorityTone = task ? TASK_PRIORITY_TONE[task.priority] : null
  return (
    <div
      className={`group flex items-center gap-2 rounded-md border bg-card px-2 py-2 transition-shadow ${
        dragging ? "shadow-xl ring-1 ring-primary/40" : "hover:shadow-sm"
      }`}
    >
      <span
        aria-hidden
        className="text-muted-foreground/50 group-hover:text-muted-foreground"
      >
        <GripVertical className="size-4" />
      </span>
      {priorityTone && (
        <span
          aria-label={`Priority ${task!.priority}`}
          className={`size-2 shrink-0 rounded-full ${TONE_CLASSES[priorityTone].dot}`}
        />
      )}
      {task ? (
        <>
          <Link
            href={`/projects/${projectId}/tasks/${task.id}`}
            className="flex-1 truncate text-sm underline-offset-2 hover:underline"
          >
            {task.title}
          </Link>
          <span className="text-xs text-muted-foreground">
            {task.phaseId ? phasesById.get(task.phaseId)?.name : "No phase"}
          </span>
          {onTaskStatus ? (
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
                  </StatusPill>
                }
              />
              <DropdownMenuContent align="end">
                {TASK_STATUS_ORDER.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => onTaskStatus(task, s)}
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
          ) : (
            <StatusPill tone={TASK_STATUS_TONE[task.status]} dot size="sm">
              {TASK_STATUS_LABEL[task.status]}
            </StatusPill>
          )}
        </>
      ) : (
        <span className="flex-1 text-sm">{pick.note}</span>
      )}
      {onRemove ? (
        <Button
          variant="ghost"
          size="icon-xs"
          className="opacity-0 group-hover:opacity-100"
          aria-label="Remove from today"
          onClick={() => onRemove(pick.id)}
        >
          <Trash2 />
        </Button>
      ) : null}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────
 * Backlog drop zone
 * ────────────────────────────────────────────────────────────────── */
function BacklogDropZone({
  tasks,
  phasesById,
  projectId,
  onPick,
}: {
  tasks: Task[]
  phasesById: Map<string, Phase>
  projectId: string
  onPick: (taskId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: BACKLOG_CONTAINER })

  return (
    <SortableContext
      items={tasks.map((t) => backlogDragId(t.id))}
      strategy={verticalListSortingStrategy}
    >
      <motion.ul
        ref={setNodeRef}
        layout
        animate={{
          boxShadow: isOver
            ? "inset 0 0 0 2px rgba(239, 68, 68, 0.45)"
            : "inset 0 0 0 0 rgba(239, 68, 68, 0)",
        }}
        transition={SPRING_SNAP}
        className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto rounded-xl border border-border/60 bg-background/40 p-2"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {tasks.length === 0 ? (
            <motion.li
              key="empty"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={SPRING_SNAP}
              className="px-2 py-6 text-center text-sm text-muted-foreground"
            >
              Nothing matches the current filters.
            </motion.li>
          ) : (
            tasks.map((task) => (
              <SortableBacklogRow
                key={task.id}
                task={task}
                phaseName={
                  task.phaseId ? phasesById.get(task.phaseId)?.name ?? null : null
                }
                projectId={projectId}
                onPick={onPick}
              />
            ))
          )}
        </AnimatePresence>
      </motion.ul>
    </SortableContext>
  )
}

function SortableBacklogRow({
  task,
  phaseName,
  projectId,
  onPick,
}: {
  task: Task
  phaseName: string | null
  projectId: string
  onPick: (taskId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: backlogDragId(task.id) })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <motion.li
      ref={setNodeRef}
      style={style}
      layout="position"
      initial={{ opacity: 0, scale: 0.94, y: -4 }}
      animate={{ opacity: isDragging ? 0.25 : 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -12 }}
      transition={SPRING_POP}
      {...attributes}
      {...listeners}
      className="cursor-grab touch-none active:cursor-grabbing"
    >
      <BacklogRowInner
        task={task}
        phaseName={phaseName}
        projectId={projectId}
        onPick={onPick}
      />
    </motion.li>
  )
}

function BacklogRowInner({
  task,
  phaseName,
  projectId,
  onPick,
  dragging,
}: {
  task: Task
  phaseName: string | null
  projectId: string
  onPick?: (taskId: string) => void
  dragging?: boolean
}) {
  const priorityTone = TASK_PRIORITY_TONE[task.priority]
  const statusTone = TASK_STATUS_TONE[task.status]
  return (
    <div
      className={`group flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors ${
        dragging
          ? "border-primary/40 bg-card shadow-xl"
          : "border-transparent hover:border-border hover:bg-muted/60"
      }`}
    >
      <span
        aria-hidden
        className="text-muted-foreground/40 group-hover:text-muted-foreground"
      >
        <GripVertical className="size-4" />
      </span>
      <span
        aria-label={`Priority ${task.priority}`}
        className={`size-2 shrink-0 rounded-full ${TONE_CLASSES[priorityTone].dot}`}
      />
      <Link
        href={`/projects/${projectId}/tasks/${task.id}`}
        className="flex-1 truncate underline-offset-2 hover:underline"
      >
        {task.title}
      </Link>
      {phaseName && (
        <span
          className={`hidden rounded-full border px-1.5 py-px text-[10px] font-medium md:inline-flex ${TONE_CLASSES["primary"].soft}`}
        >
          {phaseName}
        </span>
      )}
      <span
        className={`hidden rounded-full px-1.5 py-px text-[10px] font-medium sm:inline-flex ${TONE_CLASSES[statusTone].soft}`}
      >
        {TASK_STATUS_LABEL[task.status]}
      </span>
      {onPick ? (
        <motion.button
          type="button"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          transition={SPRING_POP}
          onClick={() => onPick(task.id)}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium hover:bg-muted"
        >
          <Plus className="size-3" />
          Today
        </motion.button>
      ) : null}
    </div>
  )
}
