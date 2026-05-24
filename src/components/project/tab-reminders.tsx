"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  deleteReminder,
  insertReminder,
  listReminders,
  updateReminder,
  type Reminder,
} from "@/lib/reminders-db"

export function TabReminders({ projectId }: { projectId: string }) {
  const [reminders, setReminders] = React.useState<Reminder[]>([])
  const [loading, setLoading] = React.useState(true)
  const [title, setTitle] = React.useState("")
  const [remindAt, setRemindAt] = React.useState("")

  React.useEffect(() => {
    listReminders(projectId).then((r) => {
      setReminders(r)
      setLoading(false)
    })
  }, [projectId])

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim()) return
    const created = await insertReminder({
      projectId,
      title,
      remindAt: remindAt ? new Date(remindAt).toISOString() : null,
    })
    setReminders((prev) => [...prev, created])
    setTitle("")
    setRemindAt("")
  }

  async function handleToggle(r: Reminder) {
    const updated = await updateReminder(r.id, { completed: !r.completed })
    setReminders((prev) => prev.map((x) => (x.id === r.id ? updated : x)))
  }

  async function handleDelete(id: string) {
    await deleteReminder(id)
    setReminders((prev) => prev.filter((r) => r.id !== id))
  }

  if (loading) return <Skeleton className="h-40 w-full" />

  const open = reminders.filter((r) => !r.completed)
  const done = reminders.filter((r) => r.completed)

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleAdd}
        className="flex flex-wrap items-end gap-2 rounded-md border border-dashed bg-muted/30 p-3"
      >
        <div className="flex-1 min-w-48">
          <Input
            placeholder="Remind me to…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <Input
          type="datetime-local"
          value={remindAt}
          onChange={(e) => setRemindAt(e.target.value)}
          className="w-56"
        />
        <Button type="submit" disabled={!title.trim()}>
          <Plus />
          Add reminder
        </Button>
      </form>

      <Section title="Open" reminders={open} onToggle={handleToggle} onDelete={handleDelete} />
      {done.length > 0 && (
        <Section
          title="Completed"
          reminders={done}
          onToggle={handleToggle}
          onDelete={handleDelete}
          muted
        />
      )}
    </div>
  )
}

function Section({
  title,
  reminders,
  onToggle,
  onDelete,
  muted,
}: {
  title: string
  reminders: Reminder[]
  onToggle: (r: Reminder) => void
  onDelete: (id: string) => void
  muted?: boolean
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {reminders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {reminders.map((r) => (
            <li
              key={r.id}
              className="group flex items-center gap-3 rounded-md border bg-card px-3 py-2"
            >
              <input
                type="checkbox"
                checked={r.completed}
                onChange={() => onToggle(r)}
                className="size-4"
                aria-label={`Toggle ${r.title}`}
              />
              <span
                className={`flex-1 text-sm ${
                  muted ? "text-muted-foreground line-through" : ""
                }`}
              >
                {r.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {r.remindAt ? new Date(r.remindAt).toLocaleString() : "—"}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100"
                aria-label={`Delete ${r.title}`}
                onClick={() => onDelete(r.id)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
