"use client"

import * as React from "react"
import { ListOrdered, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/ui/status-pill"
import { Textarea } from "@/components/ui/textarea"
import { REQUIREMENT_STATUS_TONE, TONE_CLASSES } from "@/lib/status-colors"
import {
  deleteRequirement,
  insertRequirement,
  listRequirements,
  updateRequirement,
  type Requirement,
} from "@/lib/requirements-db"
import { cn } from "@/lib/utils"

export function TabRequirements({ projectId }: { projectId: string }) {
  const [items, setItems] = React.useState<Requirement[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    listRequirements(projectId).then((r) => {
      setItems(r)
      setLoading(false)
    })
  }, [projectId])

  async function handleAdd(input: {
    title: string
    description: string
    steps: string[]
  }) {
    const created = await insertRequirement({
      projectId,
      title: input.title,
      description: input.description.trim() || null,
      steps: input.steps,
    })
    setItems((prev) => [created, ...prev])
  }

  async function handleToggle(r: Requirement) {
    const updated = await updateRequirement(r.id, {
      status: r.status === "open" ? "received" : "open",
    })
    setItems((prev) => prev.map((x) => (x.id === r.id ? updated : x)))
  }

  async function handleDelete(id: string) {
    await deleteRequirement(id)
    setItems((prev) => prev.filter((r) => r.id !== id))
  }

  if (loading) return <Skeleton className="h-40 w-full" />

  const open = items.filter((r) => r.status === "open")
  const received = items.filter((r) => r.status === "received")

  return (
    <div className="flex flex-col gap-6">
      <AddRequirementForm onAdd={handleAdd} />

      <Section
        title="Waiting on client"
        items={open}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />
      {received.length > 0 && (
        <Section
          title="Received"
          items={received}
          onToggle={handleToggle}
          onDelete={handleDelete}
          muted
        />
      )}
    </div>
  )
}

function AddRequirementForm({
  onAdd,
}: {
  onAdd: (input: {
    title: string
    description: string
    steps: string[]
  }) => Promise<void>
}) {
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [steps, setSteps] = React.useState<string[]>([])
  const [submitting, setSubmitting] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await onAdd({
        title: title.trim(),
        description,
        steps: steps.map((s) => s.trim()).filter(Boolean),
      })
      setTitle("")
      setDescription("")
      setSteps([])
    } finally {
      setSubmitting(false)
    }
  }

  function updateStep(i: number, value: string) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? value : s)))
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i))
  }

  function addStep() {
    setSteps((prev) => [...prev, ""])
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-dashed bg-muted/30 p-3"
    >
      <Input
        placeholder="What do we need from the client?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        placeholder="Optional details / context"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />

      {steps.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="text-xs font-medium text-muted-foreground">
            Steps to provide this
          </div>
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {i + 1}.
              </span>
              <Input
                value={step}
                onChange={(e) => updateStep(i, e.target.value)}
                placeholder={`Step ${i + 1}`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => removeStep(i)}
                aria-label={`Remove step ${i + 1}`}
              >
                <X />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addStep}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-3.5" />
          {steps.length === 0 ? "Add steps (optional)" : "Add another step"}
        </Button>
        <Button type="submit" disabled={!title.trim() || submitting}>
          <Plus />
          Add requirement
        </Button>
      </div>
    </form>
  )
}

function Section({
  title,
  items,
  onToggle,
  onDelete,
  muted,
}: {
  title: string
  items: Requirement[]
  onToggle: (r: Requirement) => void
  onDelete: (id: string) => void
  muted?: boolean
}) {
  if (items.length === 0) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      </section>
    )
  }
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <StatusPill tone={muted ? "success" : "warning"} size="sm" dot>
          {items.length}
        </StatusPill>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((r) => (
          <RequirementItem
            key={r.id}
            requirement={r}
            onToggle={onToggle}
            onDelete={onDelete}
            muted={muted}
          />
        ))}
      </ul>
    </section>
  )
}

function RequirementItem({
  requirement: r,
  onToggle,
  onDelete,
  muted,
}: {
  requirement: Requirement
  onToggle: (r: Requirement) => void
  onDelete: (id: string) => void
  muted?: boolean
}) {
  const tone = REQUIREMENT_STATUS_TONE[r.status]
  const palette = TONE_CLASSES[tone]
  const hasSteps = r.steps.length > 0
  const hasDescription = !!r.description

  return (
    <li className="group relative overflow-hidden rounded-md border bg-card">
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-0.5", palette.dot)}
      />
      <div className="flex items-start gap-3 px-3 py-2.5">
        <input
          type="checkbox"
          checked={r.status === "received"}
          onChange={() => onToggle(r)}
          className="mt-1 size-4 shrink-0 accent-primary"
          aria-label={`Toggle ${r.title}`}
        />
        <div className="flex-1 space-y-1">
          <div
            className={cn(
              "text-sm",
              muted ? "text-muted-foreground line-through" : "font-medium"
            )}
          >
            {r.title}
          </div>
          {hasDescription && (
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
              {r.description}
            </p>
          )}
          {hasSteps && (
            <div className="mt-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <ListOrdered className="size-3.5" />
                How to provide this
              </div>
              <ol className="space-y-1">
                {r.steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs leading-relaxed"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
                        muted
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/15 text-primary"
                      )}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={cn(
                        muted
                          ? "text-muted-foreground line-through"
                          : "text-foreground/90"
                      )}
                    >
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          className="opacity-0 group-hover:opacity-100"
          aria-label={`Delete ${r.title}`}
          onClick={() => onDelete(r.id)}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  )
}
