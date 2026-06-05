"use client"

import * as React from "react"
import {
  ArrowRight,
  CalendarCheck,
  ListTodo,
  StickyNote,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusPill } from "@/components/ui/status-pill"
import { TabToday } from "@/components/project/tab-today"
import {
  isoToday,
  listTodayPicks,
  type TodayPick,
} from "@/lib/today-db"
import {
  listTasks,
  TASK_STATUS_LABEL,
  type Task,
} from "@/lib/tasks-db"
import { TASK_PRIORITY_TONE, TASK_STATUS_TONE } from "@/lib/status-colors"

type Row =
  | { kind: "task"; pick: TodayPick; task: Task }
  | { kind: "note"; pick: TodayPick }

export function DashboardTodayCard({ projectId }: { projectId: string }) {
  const [picks, setPicks] = React.useState<TodayPick[] | null>(null)
  const [tasksById, setTasksById] = React.useState<Map<string, Task>>(
    new Map()
  )
  const [open, setOpen] = React.useState(false)

  async function load() {
    try {
      const [pickRows, taskRows] = await Promise.all([
        listTodayPicks(projectId, isoToday()),
        listTasks(projectId),
      ])
      setPicks(pickRows)
      setTasksById(new Map(taskRows.map((t) => [t.id, t])))
    } catch {
      setPicks([])
    }
  }

  React.useEffect(() => {
    void load()
  }, [projectId])

  // Reload whenever the dialog closes so the card reflects edits made inside.
  React.useEffect(() => {
    if (!open) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const rows: Row[] = (picks ?? [])
    .map((p): Row | null => {
      if (p.taskId) {
        const t = tasksById.get(p.taskId)
        if (!t) return null
        return { kind: "task", task: t, pick: p }
      }
      return { kind: "note", pick: p }
    })
    .filter((x): x is Row => x !== null)

  const visible = rows.slice(0, 5)
  const remaining = rows.length - visible.length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="group flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40">
        <header className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <CalendarCheck className="size-5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-semibold">Today</span>
            <span className="text-[11px] text-muted-foreground">
              {rows.length === 0
                ? "Nothing planned yet"
                : `${rows.length} ${
                    rows.length === 1 ? "item" : "items"
                  } picked for today`}
            </span>
          </div>
          <Button
            size="sm"
            type="button"
            onClick={() => setOpen(true)}
          >
            <ListTodo />
            Plan today
            <ArrowRight />
          </Button>
        </header>

        {picks === null ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center justify-center gap-2 rounded-md border border-dashed bg-background/30 px-3 py-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ListTodo className="size-3.5" />
            Pick tasks from the backlog for today
          </button>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {visible.map((row) =>
              row.kind === "task" ? (
                <li
                  key={row.pick.id}
                  className="flex items-center gap-2 rounded-md border bg-background/40 px-2.5 py-1.5"
                >
                  <StatusPill
                    tone={TASK_STATUS_TONE[row.task.status]}
                    dot
                    size="sm"
                  >
                    {TASK_STATUS_LABEL[row.task.status]}
                  </StatusPill>
                  <span className="flex-1 truncate text-sm font-medium">
                    {row.task.title}
                  </span>
                  {row.task.priority !== "low" && (
                    <StatusPill
                      tone={TASK_PRIORITY_TONE[row.task.priority]}
                      size="sm"
                      className="hidden sm:inline-flex"
                    >
                      {row.task.priority}
                    </StatusPill>
                  )}
                </li>
              ) : (
                <li
                  key={row.pick.id}
                  className="flex items-center gap-2 rounded-md border border-dashed bg-background/30 px-2.5 py-1.5 text-sm italic text-muted-foreground"
                >
                  <StickyNote className="size-3.5 text-primary" />
                  <span className="truncate">{row.pick.note}</span>
                </li>
              )
            )}
            {remaining > 0 && (
              <li className="px-2.5 py-1 text-[11px] text-muted-foreground">
                +{remaining} more
              </li>
            )}
          </ul>
        )}
      </div>

      <DialogContent className="flex max-h-[90vh] w-[min(96vw,72rem)] max-w-none flex-col gap-0 p-0 sm:max-w-none">
        <DialogHeader className="flex flex-row items-center justify-between border-b px-5 py-3">
          <DialogTitle>Plan today</DialogTitle>
          <DialogClose
            render={
              <Button variant="ghost" size="icon-sm" type="button">
                <X />
              </Button>
            }
          />
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <TabToday projectId={projectId} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
