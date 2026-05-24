"use client"

import * as React from "react"
import { CheckSquare, Plus, Square, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  createTaskChecklistItem,
  deleteTaskChecklistItem,
  listTaskChecklistItems,
  updateTaskChecklistItem,
  type TaskChecklistItem,
} from "@/lib/task-checklist-db"

export function TaskChecklist({ taskId }: { taskId: string }) {
  const [items, setItems] = React.useState<TaskChecklistItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [draft, setDraft] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    listTaskChecklistItems(taskId).then((rows) => {
      if (cancelled) return
      setItems(rows)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [taskId])

  const doneCount = items.filter((i) => i.done).length

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const title = draft.trim()
    if (!title || submitting) return
    setSubmitting(true)
    try {
      const created = await createTaskChecklistItem({
        taskId,
        title,
        position: items.length,
      })
      setItems((prev) => [...prev, created])
      setDraft("")
    } finally {
      setSubmitting(false)
    }
  }

  async function toggle(item: TaskChecklistItem) {
    const optimistic = { ...item, done: !item.done }
    setItems((prev) => prev.map((i) => (i.id === item.id ? optimistic : i)))
    const updated = await updateTaskChecklistItem(item.id, {
      done: optimistic.done,
    })
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
  }

  async function rename(item: TaskChecklistItem, title: string) {
    const next = title.trim()
    if (!next || next === item.title) return
    const updated = await updateTaskChecklistItem(item.id, { title: next })
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await deleteTaskChecklistItem(id)
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold tracking-tight">Checklist</h2>
        {items.length > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {doneCount} / {items.length} done
          </span>
        )}
      </header>

      {loading ? (
        <Skeleton className="h-20 w-full" />
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Break this task into small steps — they&rsquo;ll tick off as you go.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <ChecklistRow
              key={item.id}
              item={item}
              onToggle={() => toggle(item)}
              onRename={(t) => rename(item, t)}
              onDelete={() => remove(item.id)}
            />
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a checklist item…"
          className="h-8 text-sm"
        />
        <Button
          type="submit"
          size="xs"
          variant="outline"
          disabled={!draft.trim() || submitting}
        >
          <Plus />
          Add
        </Button>
      </form>
    </section>
  )
}

function ChecklistRow({
  item,
  onToggle,
  onRename,
  onDelete,
}: {
  item: TaskChecklistItem
  onToggle: () => void
  onRename: (title: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [value, setValue] = React.useState(item.title)

  React.useEffect(() => setValue(item.title), [item.title])

  function commit() {
    setEditing(false)
    if (value.trim() && value.trim() !== item.title) {
      onRename(value.trim())
    } else {
      setValue(item.title)
    }
  }

  return (
    <li className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/40">
      <button
        type="button"
        onClick={onToggle}
        aria-label={item.done ? "Mark not done" : "Mark done"}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        {item.done ? (
          <CheckSquare className="size-4 text-success" />
        ) : (
          <Square className="size-4" />
        )}
      </button>
      {editing ? (
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") {
              setValue(item.title)
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
            item.done
              ? "text-muted-foreground line-through"
              : "text-foreground"
          }`}
        >
          {item.title}
        </button>
      )}
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Delete"
        onClick={onDelete}
        className="opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 />
      </Button>
    </li>
  )
}
