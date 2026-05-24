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
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CalendarClock, GripVertical, Sparkles, User } from "lucide-react"

import { StatusPill } from "@/components/ui/status-pill"
import {
  phaseToneFor,
  TASK_STATUS_TONE,
  TONE_CLASSES,
} from "@/lib/status-colors"
import type { Phase } from "@/lib/phases-db"
import {
  TASK_STATUS_LABEL,
  TASK_STATUS_ORDER,
  type Task,
  type TaskStatus,
} from "@/lib/tasks-db"

type Props = {
  projectId: string
  tasks: Task[]
  phases: Phase[]
  onTaskMove: (
    taskId: string,
    newStatus: TaskStatus,
    newPosition: number
  ) => void
}

export function KanbanBoard({ projectId, tasks, phases, onTaskMove }: Props) {
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [localTasks, setLocalTasks] = React.useState<Task[]>(tasks)

  React.useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )

  const phasesById = React.useMemo(
    () => new Map(phases.map((p) => [p.id, p])),
    [phases]
  )

  const byStatus = React.useMemo(() => {
    const map = new Map<TaskStatus, Task[]>()
    for (const s of TASK_STATUS_ORDER) map.set(s, [])
    for (const t of [...localTasks].sort((a, b) => a.position - b.position)) {
      map.get(t.status)?.push(t)
    }
    return map
  }, [localTasks])

  function findContainerFor(id: string): TaskStatus | null {
    if (TASK_STATUS_ORDER.includes(id as TaskStatus)) return id as TaskStatus
    const t = localTasks.find((x) => x.id === id)
    return t?.status ?? null
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const activeContainer = findContainerFor(activeId)
    const overContainer = findContainerFor(overId)
    if (!activeContainer || !overContainer) return
    if (activeContainer === overContainer) return

    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === activeId ? { ...t, status: overContainer } : t
      )
    )
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)

    const activeContainer = findContainerFor(activeId)
    const overContainer = findContainerFor(overId)
    if (!activeContainer || !overContainer) return

    setLocalTasks((prev) => {
      const moved = prev.find((t) => t.id === activeId)
      if (!moved) return prev

      const targetList = prev
        .filter((t) => t.status === overContainer && t.id !== activeId)
        .sort((a, b) => a.position - b.position)

      let insertIndex = targetList.length
      if (overId !== overContainer) {
        const overIdx = targetList.findIndex((t) => t.id === overId)
        if (overIdx >= 0) insertIndex = overIdx
      }

      const newList = [
        ...targetList.slice(0, insertIndex),
        { ...moved, status: overContainer },
        ...targetList.slice(insertIndex),
      ].map((t, i) => ({ ...t, position: i }))

      const updatedIds = new Set(newList.map((t) => t.id))
      const others = prev.filter((t) => !updatedIds.has(t.id))
      const merged = [...others, ...newList]

      onTaskMove(activeId, overContainer, insertIndex)
      return merged
    })
  }

  const activeTask = activeId
    ? localTasks.find((t) => t.id === activeId) ?? null
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {TASK_STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={byStatus.get(status) ?? []}
            phasesById={phasesById}
            projectId={projectId}
          />
        ))}
      </div>
      <DragOverlay zIndex={50} dropAnimation={null}>
        {activeTask ? (
          <div className="rotate-1 scale-[1.02]">
            <TaskCardInner
              task={activeTask}
              phaseName={
                activeTask.phaseId
                  ? phasesById.get(activeTask.phaseId)?.name ?? null
                  : null
              }
              projectId={projectId}
              dragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function KanbanColumn({
  status,
  tasks,
  phasesById,
  projectId,
}: {
  status: TaskStatus
  tasks: Task[]
  phasesById: Map<string, Phase>
  projectId: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const tone = TASK_STATUS_TONE[status]
  const palette = TONE_CLASSES[tone]

  return (
    <section
      ref={setNodeRef}
      className={`relative flex flex-col gap-2 overflow-hidden rounded-xl border bg-card/60 backdrop-blur-sm p-2 pt-0 transition-colors ${
        isOver ? "bg-card" : ""
      }`}
    >
      <header className={`relative -mx-2 -mt-px mb-1 flex items-center justify-between px-3 pt-2.5 pb-2 ${palette.soft}`}>
        <span
          aria-hidden
          className={`absolute inset-x-0 top-0 h-[3px] ${palette.dot}`}
        />
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${palette.dot}`} aria-hidden />
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            {TASK_STATUS_LABEL[status]}
          </span>
        </div>
        <span className={`text-[11px] font-medium ${palette.text}`}>
          {tasks.length}
        </span>
      </header>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="flex min-h-16 flex-col gap-2 px-0.5 pb-1">
          {tasks.length === 0 ? (
            <li className="rounded-md border border-dashed border-border bg-background/40 px-3 py-6 text-center text-[11px] uppercase tracking-wide text-muted-foreground">
              Drop tasks here
            </li>
          ) : (
            tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                phaseName={
                  task.phaseId
                    ? phasesById.get(task.phaseId)?.name ?? null
                    : null
                }
                projectId={projectId}
              />
            ))
          )}
        </ul>
      </SortableContext>
    </section>
  )
}

function SortableTaskCard({
  task,
  phaseName,
  projectId,
}: {
  task: Task
  phaseName: string | null
  projectId: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab touch-none active:cursor-grabbing"
    >
      <TaskCardInner
        task={task}
        phaseName={phaseName}
        projectId={projectId}
      />
    </li>
  )
}

function TaskCardInner({
  task,
  phaseName,
  projectId,
  dragging,
}: {
  task: Task
  phaseName: string | null
  projectId: string
  dragging?: boolean
}) {
  const statusTone = TASK_STATUS_TONE[task.status]
  const statusPalette = TONE_CLASSES[statusTone]
  const phaseTone = phaseToneFor(task.phaseId)
  const phasePalette = TONE_CLASSES[phaseTone]

  return (
    <div
      className={`group/card relative overflow-hidden rounded-md border bg-card text-card-foreground shadow-sm transition-shadow ${
        dragging ? "shadow-lg ring-1 ring-primary/30" : "hover:shadow-md"
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-1 ${statusPalette.dot}`}
      />
      <div className="flex items-start gap-2 pl-3 pr-2 py-2">
        <span
          aria-hidden
          className="mt-0.5 text-muted-foreground/50 group-hover/card:text-muted-foreground"
        >
          <GripVertical className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Link
            href={`/projects/${projectId}/tasks/${task.id}`}
            className="line-clamp-2 text-sm font-medium leading-snug underline-offset-2 hover:underline"
          >
            {task.title}
          </Link>
          <div className="flex flex-wrap items-center gap-1.5">
            {phaseName && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px text-[10px] font-medium ${phasePalette.soft}`}
              >
                <span
                  aria-hidden
                  className={`size-1 rounded-full ${phasePalette.dot}`}
                />
                {phaseName}
              </span>
            )}
            {task.source === "fathom" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
                <Sparkles className="size-2.5" />
                AI
              </span>
            )}
            {task.dueDate && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
                <CalendarClock className="size-2.5" />
                {task.dueDate}
              </span>
            )}
            {task.assignee && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-px text-[10px] text-muted-foreground">
                <User className="size-2.5" />
                {task.assignee}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
