"use client"

import * as React from "react"
import { Check, ChevronDown, ChevronRight, GraduationCap, Pencil, Plus, Save, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  deleteOnboardingStep,
  getProjectOnboardingOverview,
  insertOnboardingStep,
  listOnboardingSteps,
  updateOnboardingStep,
  updateProjectOnboardingOverview,
  type OnboardingStep,
} from "@/lib/onboarding-db"
import { listResources, type Resource } from "@/lib/resources-db"

export function TabOnboarding({ projectId }: { projectId: string }) {
  const [overview, setOverview] = React.useState("")
  const [savedOverview, setSavedOverview] = React.useState("")
  const [editingOverview, setEditingOverview] = React.useState(false)
  const [steps, setSteps] = React.useState<OnboardingStep[]>([])
  const [resources, setResources] = React.useState<Resource[]>([])
  const [loading, setLoading] = React.useState(true)
  const [newTitle, setNewTitle] = React.useState("")
  const [newBody, setNewBody] = React.useState("")

  React.useEffect(() => {
    Promise.all([
      getProjectOnboardingOverview(projectId),
      listOnboardingSteps(projectId),
      listResources(projectId),
    ]).then(([ov, s, r]) => {
      setOverview(ov ?? "")
      setSavedOverview(ov ?? "")
      setSteps(s)
      setResources(r)
      setLoading(false)
    })
  }, [projectId])

  async function saveOverview() {
    const next = overview.trim()
    await updateProjectOnboardingOverview(projectId, next || null)
    setSavedOverview(next)
    setEditingOverview(false)
  }

  function cancelOverview() {
    setOverview(savedOverview)
    setEditingOverview(false)
  }

  async function addStep(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const created = await insertOnboardingStep({
      projectId,
      title: newTitle,
      body: newBody.trim() || null,
      position: steps.length,
    })
    setSteps((prev) => [...prev, created])
    setNewTitle("")
    setNewBody("")
  }

  async function toggleStep(step: OnboardingStep) {
    const updated = await updateOnboardingStep(step.id, { done: !step.done })
    setSteps((prev) => prev.map((s) => (s.id === step.id ? updated : s)))
  }

  async function saveStepEdit(
    step: OnboardingStep,
    patch: { title: string; body: string }
  ) {
    const updated = await updateOnboardingStep(step.id, {
      title: patch.title.trim(),
      body: patch.body.trim() || null,
    })
    setSteps((prev) => prev.map((s) => (s.id === step.id ? updated : s)))
  }

  async function removeStep(id: string) {
    await deleteOnboardingStep(id)
    setSteps((prev) => prev.filter((s) => s.id !== id))
  }

  if (loading) return <Skeleton className="h-60 w-full" />

  const completed = steps.filter((s) => s.done).length
  const totalSteps = steps.length

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-2 rounded-md border bg-card px-4 py-3">
        <GraduationCap className="size-5 text-primary" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold tracking-tight">Dev onboarding</h2>
          <p className="text-xs text-muted-foreground">
            Welcome new devs and walk them through everything they need to ship
            on this project.
          </p>
        </div>
        {totalSteps > 0 && (
          <Badge variant="outline">
            {completed}/{totalSteps} done
          </Badge>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight">Welcome</h3>
          {!editingOverview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingOverview(true)}
            >
              <Pencil />
              Edit
            </Button>
          )}
        </div>
        {editingOverview ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              rows={6}
              placeholder="Welcome message, project background, who to ask for help, deploy targets, the lay of the land…"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={cancelOverview}>
                <X />
                Cancel
              </Button>
              <Button size="sm" onClick={saveOverview}>
                <Save />
                Save
              </Button>
            </div>
          </div>
        ) : savedOverview ? (
          <p className="whitespace-pre-wrap rounded-md border bg-card px-4 py-3 text-sm">
            {savedOverview}
          </p>
        ) : (
          <p className="rounded-md border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            No welcome text yet. Click Edit to write one.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold tracking-tight">Steps</h3>
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No steps yet. Add the first one below — clone the repo, set env
            vars, run the migrations, etc.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {steps.map((step, idx) => (
              <StepCard
                key={step.id}
                index={idx + 1}
                step={step}
                onToggle={() => toggleStep(step)}
                onSave={(patch) => saveStepEdit(step, patch)}
                onDelete={() => removeStep(step.id)}
              />
            ))}
          </ol>
        )}
        <form
          onSubmit={addStep}
          className="flex flex-col gap-2 rounded-md border border-dashed bg-muted/30 p-3"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="step-title">Title</Label>
            <Input
              id="step-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Clone the repo and install deps"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="step-body">Details</Label>
            <Textarea
              id="step-body"
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              rows={3}
              placeholder="Commands, links, gotchas…"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!newTitle.trim()}>
              <Plus />
              Add step
            </Button>
          </div>
        </form>
      </section>

      {resources.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold tracking-tight">
            Resources at a glance
          </h3>
          <p className="text-xs text-muted-foreground">
            Pulled from the Resources tab. Sensitive values stay hidden — open
            Resources to reveal.
          </p>
          <ul className="flex flex-col gap-1.5">
            {resources.map((r) => {
              const isLink =
                r.value.startsWith("http://") || r.value.startsWith("https://")
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
                    {r.isSensitive ? "•••••••• (sensitive)" : isLink ? (
                      <a
                        href={r.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-2 hover:underline"
                      >
                        {r.value}
                      </a>
                    ) : (
                      r.value
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

function StepCard({
  index,
  step,
  onToggle,
  onSave,
  onDelete,
}: {
  index: number
  step: OnboardingStep
  onToggle: () => void
  onSave: (patch: { title: string; body: string }) => Promise<void>
  onDelete: () => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [title, setTitle] = React.useState(step.title)
  const [body, setBody] = React.useState(step.body ?? "")

  React.useEffect(() => {
    setTitle(step.title)
    setBody(step.body ?? "")
  }, [step])

  async function save() {
    await onSave({ title, body })
    setEditing(false)
  }

  return (
    <li className="group flex flex-col gap-2 rounded-md border bg-card px-3 py-2.5">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={step.done}
          onChange={onToggle}
          className="mt-1 size-4"
          aria-label={`Toggle ${step.title}`}
        />
        <span
          className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium ${
            step.done
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {step.done ? <Check className="size-3.5" /> : index}
        </span>
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left"
          onClick={() => step.body && setExpanded((v) => !v)}
        >
          <span
            className={`text-sm font-medium ${
              step.done ? "text-muted-foreground line-through" : ""
            }`}
          >
            {step.title}
          </span>
          {step.body && (
            <>
              {expanded ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
            </>
          )}
        </button>
        {!editing && (
          <>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 group-hover:opacity-100"
              aria-label="Edit"
              onClick={() => {
                setEditing(true)
                setExpanded(true)
              }}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 group-hover:opacity-100"
              aria-label="Delete"
              onClick={onDelete}
            >
              <Trash2 />
            </Button>
          </>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2 pl-12">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Details, commands, links…"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTitle(step.title)
                setBody(step.body ?? "")
                setEditing(false)
              }}
            >
              <X />
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={!title.trim()}>
              <Save />
              Save
            </Button>
          </div>
        </div>
      ) : (
        expanded &&
        step.body && (
          <p className="whitespace-pre-wrap pl-12 text-sm text-muted-foreground">
            {step.body}
          </p>
        )
      )}
    </li>
  )
}
