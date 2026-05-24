"use client"

import * as React from "react"
import { Check, Plus, Tag as TagIcon, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusPill } from "@/components/ui/status-pill"
import { TONE_CLASSES } from "@/lib/status-colors"
import {
  attachTagToTask,
  createTag,
  detachTagFromTask,
  listTags,
  listTaskTags,
  TAG_COLOR_ORDER,
  type Tag,
  type TagColor,
} from "@/lib/tags-db"

export function TaskTags({
  projectId,
  taskId,
}: {
  projectId: string
  taskId: string
}) {
  const [allTags, setAllTags] = React.useState<Tag[]>([])
  const [selected, setSelected] = React.useState<Tag[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [newColor, setNewColor] = React.useState<TagColor>("primary")

  React.useEffect(() => {
    let cancelled = false
    Promise.all([listTags(projectId), listTaskTags(taskId)]).then(
      ([all, mine]) => {
        if (cancelled) return
        setAllTags(all)
        setSelected(mine)
        setLoading(false)
      }
    )
    return () => {
      cancelled = true
    }
  }, [projectId, taskId])

  const selectedIds = React.useMemo(
    () => new Set(selected.map((t) => t.id)),
    [selected]
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allTags
    return allTags.filter((t) => t.name.toLowerCase().includes(q))
  }, [allTags, query])

  const canCreateNew =
    query.trim().length > 0 &&
    !allTags.some(
      (t) => t.name.toLowerCase() === query.trim().toLowerCase()
    )

  async function handleToggle(tag: Tag) {
    if (selectedIds.has(tag.id)) {
      setSelected((prev) => prev.filter((t) => t.id !== tag.id))
      await detachTagFromTask(taskId, tag.id)
    } else {
      setSelected((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)))
      await attachTagToTask(taskId, tag.id)
    }
  }

  async function handleCreate() {
    const name = query.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      const tag = await createTag({ projectId, name, color: newColor })
      setAllTags((prev) =>
        [...prev, tag].sort((a, b) => a.name.localeCompare(b.name))
      )
      setSelected((prev) =>
        [...prev, tag].sort((a, b) => a.name.localeCompare(b.name))
      )
      await attachTagToTask(taskId, tag.id)
      setQuery("")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Tags
        </Label>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="xs" type="button">
                <Plus />
                Add
              </Button>
            }
          />
          <DropdownMenuContent className="w-64 p-1.5">
            <div className="px-1.5 pb-1.5">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or create…"
                className="h-7 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canCreateNew) {
                    e.preventDefault()
                    void handleCreate()
                  }
                }}
              />
            </div>
            {canCreateNew && (
              <>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Create new
                </DropdownMenuLabel>
                <div className="flex items-center gap-1.5 px-2 pb-1.5">
                  {TAG_COLOR_ORDER.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      aria-label={c}
                      className={`size-4 rounded-full ${TONE_CLASSES[c].dot} ${
                        newColor === c
                          ? "ring-2 ring-offset-1 ring-offset-background ring-foreground/40"
                          : ""
                      }`}
                    />
                  ))}
                </div>
                <DropdownMenuItem onClick={handleCreate} className="gap-2">
                  <Plus className="size-3.5" />
                  Create &ldquo;{query.trim()}&rdquo;
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {filtered.length === 0 ? "No tags yet" : "Tags"}
            </DropdownMenuLabel>
            <div className="max-h-56 overflow-y-auto">
              {filtered.map((tag) => {
                const active = selectedIds.has(tag.id)
                return (
                  <DropdownMenuItem
                    key={tag.id}
                    onClick={(e) => {
                      e.preventDefault()
                      void handleToggle(tag)
                    }}
                    className="justify-between gap-2"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${TONE_CLASSES[tag.color].dot}`}
                      />
                      {tag.name}
                    </span>
                    {active && <Check className="size-3.5 text-primary" />}
                  </DropdownMenuItem>
                )
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {loading ? (
          <span className="text-xs text-muted-foreground">Loading…</span>
        ) : selected.length === 0 ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <TagIcon className="size-3" />
            No tags yet
          </span>
        ) : (
          selected.map((tag) => (
            <StatusPill key={tag.id} tone={tag.color} dot size="sm">
              {tag.name}
              <button
                type="button"
                aria-label={`Remove ${tag.name}`}
                onClick={() => void handleToggle(tag)}
                className="-mr-1 ml-0.5 rounded-full p-0.5 opacity-70 hover:opacity-100"
              >
                <X className="size-2.5" />
              </button>
            </StatusPill>
          ))
        )}
      </div>
    </div>
  )
}
