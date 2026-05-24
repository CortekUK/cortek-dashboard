"use client"

import * as React from "react"
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
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FolderPlus,
  GripVertical,
  Lock,
  Palette,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { TONE_CLASSES, type StatusTone } from "@/lib/status-colors"
import {
  deleteResource,
  deleteResourceSection,
  insertResource,
  insertResourceSection,
  listResources,
  listResourceSections,
  reorderResources,
  reorderResourceSections,
  updateResource,
  updateResourceSection,
  type Resource,
  type ResourceSection,
} from "@/lib/resources-db"

// dnd-kit needs distinguishable IDs across the same DndContext. Sections and
// resources are both UUIDs, so we prefix them when registering with dnd-kit
// and strip the prefix when calling into the DB.
const SECTION_PREFIX = "section:"
const RESOURCE_PREFIX = "resource:"
const sectionDndId = (id: string) => `${SECTION_PREFIX}${id}`
const resourceDndId = (id: string) => `${RESOURCE_PREFIX}${id}`
const isSectionDndId = (id: string) => id.startsWith(SECTION_PREFIX)
const stripPrefix = (id: string) =>
  id.slice(id.indexOf(":") + 1)

const UNSECTIONED_ID = "__unsectioned__"

const SECTION_COLORS: { tone: StatusTone; label: string }[] = [
  { tone: "neutral", label: "Neutral" },
  { tone: "primary", label: "Primary" },
  { tone: "info", label: "Info" },
  { tone: "success", label: "Success" },
  { tone: "warning", label: "Warning" },
  { tone: "destructive", label: "Destructive" },
]

type DragKind = "section" | "resource" | null

export function TabResources({ projectId }: { projectId: string }) {
  const [sections, setSections] = React.useState<ResourceSection[]>([])
  const [resources, setResources] = React.useState<Resource[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())
  const [revealed, setRevealed] = React.useState<Set<string>>(new Set())
  const [activeDrag, setActiveDrag] = React.useState<{
    kind: DragKind
    id: string
  }>({ kind: null, id: "" })
  const [showNewSection, setShowNewSection] = React.useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )

  React.useEffect(() => {
    Promise.all([
      listResourceSections(projectId),
      listResources(projectId),
    ])
      .then(([s, r]) => {
        setSections(s)
        setResources(r)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
  }, [projectId])

  const sectionsSorted = React.useMemo(
    () => [...sections].sort((a, b) => a.position - b.position),
    [sections]
  )

  const resourcesBySection = React.useMemo(() => {
    const map = new Map<string, Resource[]>()
    for (const s of sectionsSorted) map.set(s.id, [])
    map.set(UNSECTIONED_ID, [])
    for (const r of [...resources].sort((a, b) => a.position - b.position)) {
      const key = r.sectionId ?? UNSECTIONED_ID
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return map
  }, [resources, sectionsSorted])

  const hasUnsectioned = (resourcesBySection.get(UNSECTIONED_ID) ?? []).length > 0

  // ─── section CRUD ────────────────────────────────────────────────────────

  async function handleCreateSection(name: string) {
    const created = await insertResourceSection({
      projectId,
      name,
      position: sectionsSorted.length,
    })
    setSections((prev) => [...prev, created])
    setShowNewSection(false)
  }

  async function handleRenameSection(id: string, name: string) {
    const updated = await updateResourceSection(id, { name })
    setSections((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }

  async function handleRecolorSection(id: string, color: StatusTone) {
    const updated = await updateResourceSection(id, { color })
    setSections((prev) => prev.map((s) => (s.id === id ? updated : s)))
  }

  async function handleDeleteSection(id: string) {
    const inSection = resourcesBySection.get(id) ?? []
    const msg =
      inSection.length > 0
        ? `Delete this section? Its ${inSection.length} resource${
            inSection.length === 1 ? "" : "s"
          } will move to "Unsectioned".`
        : "Delete this section?"
    if (!confirm(msg)) return
    await deleteResourceSection(id)
    setSections((prev) => prev.filter((s) => s.id !== id))
    // section_id is set to null by ON DELETE SET NULL — mirror that locally.
    setResources((prev) =>
      prev.map((r) => (r.sectionId === id ? { ...r, sectionId: null } : r))
    )
  }

  // ─── resource CRUD ───────────────────────────────────────────────────────

  async function handleAddResource(
    sectionId: string | null,
    input: { name: string; value: string; isSensitive: boolean }
  ) {
    const inSection =
      resourcesBySection.get(sectionId ?? UNSECTIONED_ID) ?? []
    const created = await insertResource({
      projectId,
      sectionId,
      name: input.name,
      value: input.value,
      isSensitive: input.isSensitive,
      position: inSection.length,
    })
    setResources((prev) => [...prev, created])
  }

  async function handleDeleteResource(id: string) {
    await deleteResource(id)
    setResources((prev) => prev.filter((r) => r.id !== id))
  }

  async function handleToggleSensitive(r: Resource) {
    const updated = await updateResource(r.id, { isSensitive: !r.isSensitive })
    setResources((prev) => prev.map((x) => (x.id === r.id ? updated : x)))
  }

  // ─── collapse / reveal ───────────────────────────────────────────────────

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleRevealed(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── drag handlers ───────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id)
    setActiveDrag({
      kind: isSectionDndId(id) ? "section" : "resource",
      id: stripPrefix(id),
    })
  }

  // Live cross-section move while dragging a resource — mirrors kanban-board.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return
    if (isSectionDndId(activeId)) return // section drags don't cross containers

    const activeResourceId = stripPrefix(activeId)
    const overSectionId = findContainerOf(overId)
    if (!overSectionId) return

    setResources((prev) => {
      const moving = prev.find((r) => r.id === activeResourceId)
      if (!moving) return prev
      const nextSection = overSectionId === UNSECTIONED_ID ? null : overSectionId
      if (moving.sectionId === nextSection) return prev
      return prev.map((r) =>
        r.id === activeResourceId ? { ...r, sectionId: nextSection } : r
      )
    })
  }

  function findContainerOf(dndId: string): string | null {
    // Dropping on a section header/body returns the section's dnd id directly.
    if (isSectionDndId(dndId)) return stripPrefix(dndId)
    if (dndId === UNSECTIONED_ID) return UNSECTIONED_ID
    // Dropping on a resource — look up which section that resource sits in.
    const rid = stripPrefix(dndId)
    const r = resources.find((x) => x.id === rid)
    if (!r) return null
    return r.sectionId ?? UNSECTIONED_ID
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDrag({ kind: null, id: "" })
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)

    // Section reorder.
    if (isSectionDndId(activeId)) {
      if (!isSectionDndId(overId)) return
      const from = sectionsSorted.findIndex(
        (s) => s.id === stripPrefix(activeId)
      )
      const to = sectionsSorted.findIndex(
        (s) => s.id === stripPrefix(overId)
      )
      if (from < 0 || to < 0 || from === to) return
      const next = [...sectionsSorted]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      const repositioned = next.map((s, i) => ({ ...s, position: i }))
      setSections(repositioned)
      await reorderResourceSections(
        repositioned.map((s) => ({ id: s.id, position: s.position }))
      )
      return
    }

    // Resource reorder (possibly across sections).
    const activeResourceId = stripPrefix(activeId)
    const targetSectionId = findContainerOf(overId)
    if (!targetSectionId) return
    const targetSection =
      targetSectionId === UNSECTIONED_ID ? null : targetSectionId

    const sameSection = resources
      .filter(
        (r) =>
          (r.sectionId ?? UNSECTIONED_ID) === targetSectionId &&
          r.id !== activeResourceId
      )
      .sort((a, b) => a.position - b.position)

    let insertIndex = sameSection.length
    if (!isSectionDndId(overId) && overId !== UNSECTIONED_ID) {
      const overResourceId = stripPrefix(overId)
      const overIdx = sameSection.findIndex((r) => r.id === overResourceId)
      if (overIdx >= 0) insertIndex = overIdx
    }

    const moving = resources.find((r) => r.id === activeResourceId)
    if (!moving) return

    const newList = [
      ...sameSection.slice(0, insertIndex),
      { ...moving, sectionId: targetSection },
      ...sameSection.slice(insertIndex),
    ].map((r, i) => ({ ...r, position: i }))

    const newIds = new Set(newList.map((r) => r.id))
    const others = resources.filter((r) => !newIds.has(r.id))
    setResources([...others, ...newList])

    await reorderResources(
      newList.map((r) => ({
        id: r.id,
        sectionId: r.sectionId,
        position: r.position,
      }))
    )
  }

  if (loading) return <Skeleton className="h-40 w-full" />

  if (loadError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
        <p className="font-medium text-destructive">Couldn&apos;t load resources</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{loadError}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Most likely the <code>0011_resource_sections</code> migration hasn&apos;t been applied yet.
        </p>
      </div>
    )
  }

  const activeResource =
    activeDrag.kind === "resource"
      ? resources.find((r) => r.id === activeDrag.id) ?? null
      : null
  const activeSection =
    activeDrag.kind === "section"
      ? sectionsSorted.find((s) => s.id === activeDrag.id) ?? null
      : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Group links, IDs, and credentials your team needs. Drag to reorder.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewSection((v) => !v)}
        >
          <FolderPlus />
          New section
        </Button>
      </div>

      {showNewSection && (
        <NewSectionForm
          onCancel={() => setShowNewSection(false)}
          onSubmit={handleCreateSection}
        />
      )}

      {sectionsSorted.length === 0 && !hasUnsectioned ? (
        <div className="rounded-md border border-dashed bg-muted/30 px-4 py-10 text-center">
          <p className="text-sm font-medium">No sections yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a section to start adding resources.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sectionsSorted.map((s) => sectionDndId(s.id))}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              {sectionsSorted.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  resources={resourcesBySection.get(section.id) ?? []}
                  collapsed={collapsed.has(section.id)}
                  revealed={revealed}
                  onToggleCollapsed={() => toggleCollapsed(section.id)}
                  onRename={(name) => handleRenameSection(section.id, name)}
                  onRecolor={(color) => handleRecolorSection(section.id, color)}
                  onDelete={() => handleDeleteSection(section.id)}
                  onAddResource={(input) => handleAddResource(section.id, input)}
                  onDeleteResource={handleDeleteResource}
                  onToggleSensitive={handleToggleSensitive}
                  onToggleRevealed={toggleRevealed}
                />
              ))}
            </div>
          </SortableContext>

          {hasUnsectioned && (
            <UnsectionedDropArea
              resources={resourcesBySection.get(UNSECTIONED_ID) ?? []}
              collapsed={collapsed.has(UNSECTIONED_ID)}
              revealed={revealed}
              onToggleCollapsed={() => toggleCollapsed(UNSECTIONED_ID)}
              onAddResource={(input) => handleAddResource(null, input)}
              onDeleteResource={handleDeleteResource}
              onToggleSensitive={handleToggleSensitive}
              onToggleRevealed={toggleRevealed}
            />
          )}

          <DragOverlay zIndex={50} dropAnimation={null}>
            {activeResource ? (
              <ResourceRowInner
                resource={activeResource}
                revealed={false}
                onToggleSensitive={() => {}}
                onToggleRevealed={() => {}}
                onDelete={() => {}}
                dragging
              />
            ) : activeSection ? (
              <div className="rounded-md border bg-card px-3 py-2 shadow-lg ring-1 ring-primary/30">
                <span className="text-sm font-semibold">{activeSection.name}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}

// ─── New section form ───────────────────────────────────────────────────────

function NewSectionForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (name: string) => Promise<void> | void
}) {
  const [name, setName] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        void onSubmit(name.trim())
        setName("")
      }}
      className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 p-2"
    >
      <Input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Section name (e.g. Credentials, Design, Hosting)"
      />
      <Button type="submit" size="sm" disabled={!name.trim()}>
        <Plus />
        Create
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        <X />
      </Button>
    </form>
  )
}

// ─── Sortable section wrapper ───────────────────────────────────────────────

type SectionViewProps = {
  section: ResourceSection
  resources: Resource[]
  collapsed: boolean
  revealed: Set<string>
  onToggleCollapsed: () => void
  onRename: (name: string) => Promise<void> | void
  onRecolor: (color: StatusTone) => Promise<void> | void
  onDelete: () => void
  onAddResource: (input: {
    name: string
    value: string
    isSensitive: boolean
  }) => Promise<void> | void
  onDeleteResource: (id: string) => Promise<void> | void
  onToggleSensitive: (r: Resource) => Promise<void> | void
  onToggleRevealed: (id: string) => void
}

function SortableSection(props: SectionViewProps) {
  const { section } = props
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionDndId(section.id) })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <SectionCard
        {...props}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

// ─── Section card (header + body) ───────────────────────────────────────────

function SectionCard({
  section,
  resources,
  collapsed,
  revealed,
  onToggleCollapsed,
  onRename,
  onRecolor,
  onDelete,
  onAddResource,
  onDeleteResource,
  onToggleSensitive,
  onToggleRevealed,
  dragHandleProps,
}: SectionViewProps & {
  dragHandleProps: React.HTMLAttributes<HTMLButtonElement>
}) {
  const [editingName, setEditingName] = React.useState(false)
  const [pickingColor, setPickingColor] = React.useState(false)
  const [name, setName] = React.useState(section.name)
  const [showAdd, setShowAdd] = React.useState(false)

  React.useEffect(() => {
    setName(section.name)
  }, [section.name])

  const { setNodeRef, isOver } = useDroppable({
    id: sectionDndId(section.id),
  })

  const palette = TONE_CLASSES[section.color]

  async function saveName() {
    const next = name.trim()
    if (!next || next === section.name) {
      setName(section.name)
      setEditingName(false)
      return
    }
    await onRename(next)
    setEditingName(false)
  }

  return (
    <section
      className={`group/section overflow-hidden rounded-lg border bg-card transition-colors ${
        isOver ? "ring-2 ring-primary/40" : ""
      }`}
    >
      <header className={`flex flex-wrap items-center gap-2 border-b px-2 py-1.5 ${palette.soft}`}>
        <button
          type="button"
          aria-label="Drag section"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
          {...dragHandleProps}
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand section" : "Collapse section"}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>

        <span
          aria-hidden
          className={`size-2 rounded-full ${palette.dot}`}
        />

        {editingName ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void saveName()
              } else if (e.key === "Escape") {
                setName(section.name)
                setEditingName(false)
              }
            }}
            autoFocus
            className="h-7 max-w-xs text-sm font-semibold"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="rounded px-1 text-sm font-semibold tracking-tight hover:bg-background/60"
          >
            {section.name}
          </button>
        )}

        <Badge variant="outline" className="text-[10px]">
          {resources.length}
        </Badge>

        <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover/section:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Change color"
            aria-pressed={pickingColor}
            onClick={() => setPickingColor((v) => !v)}
          >
            <Palette />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Rename section"
            onClick={() => setEditingName(true)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete section"
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </div>

        {pickingColor && (
          <div className="flex w-full items-center gap-1.5 pl-7">
            {SECTION_COLORS.map(({ tone, label }) => {
              const swatch = TONE_CLASSES[tone]
              const active = tone === section.color
              return (
                <button
                  key={tone}
                  type="button"
                  aria-label={label}
                  aria-pressed={active}
                  onClick={async () => {
                    if (!active) await onRecolor(tone)
                    setPickingColor(false)
                  }}
                  className={`grid size-6 place-items-center rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110 ${swatch.dot} ${
                    active ? `ring-2 ${swatch.ring}` : ""
                  }`}
                >
                  {active && (
                    <Check className="size-3 text-primary-foreground/90" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </header>

      {!collapsed && (
        <div ref={setNodeRef} className="flex flex-col gap-2 p-2">
          <SortableContext
            items={resources.map((r) => resourceDndId(r.id))}
            strategy={verticalListSortingStrategy}
          >
            {resources.length === 0 ? (
              <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-xs text-muted-foreground">
                Drop resources here, or add one below.
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {resources.map((r) => (
                  <SortableResourceRow
                    key={r.id}
                    resource={r}
                    revealed={revealed.has(r.id)}
                    onToggleSensitive={() => onToggleSensitive(r)}
                    onToggleRevealed={() => onToggleRevealed(r.id)}
                    onDelete={() => onDeleteResource(r.id)}
                  />
                ))}
              </ul>
            )}
          </SortableContext>

          {showAdd ? (
            <AddResourceForm
              onCancel={() => setShowAdd(false)}
              onSubmit={async (input) => {
                await onAddResource(input)
                setShowAdd(false)
              }}
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setShowAdd(true)}
            >
              <Plus />
              Add resource
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

// ─── Unsectioned bucket (only renders if there are orphaned resources) ──────

function UnsectionedDropArea({
  resources,
  collapsed,
  revealed,
  onToggleCollapsed,
  onAddResource,
  onDeleteResource,
  onToggleSensitive,
  onToggleRevealed,
}: {
  resources: Resource[]
  collapsed: boolean
  revealed: Set<string>
  onToggleCollapsed: () => void
  onAddResource: (input: {
    name: string
    value: string
    isSensitive: boolean
  }) => Promise<void> | void
  onDeleteResource: (id: string) => Promise<void> | void
  onToggleSensitive: (r: Resource) => Promise<void> | void
  onToggleRevealed: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: UNSECTIONED_ID })
  const [showAdd, setShowAdd] = React.useState(false)

  return (
    <section
      className={`overflow-hidden rounded-lg border border-dashed bg-muted/10 transition-colors ${
        isOver ? "ring-2 ring-primary/40" : ""
      }`}
    >
      <header className="flex items-center gap-2 px-2 py-1.5">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
        <span className="text-sm font-semibold tracking-tight text-muted-foreground">
          Unsectioned
        </span>
        <Badge variant="outline" className="text-[10px]">
          {resources.length}
        </Badge>
      </header>
      {!collapsed && (
        <div ref={setNodeRef} className="flex flex-col gap-2 p-2">
          <SortableContext
            items={resources.map((r) => resourceDndId(r.id))}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-1.5">
              {resources.map((r) => (
                <SortableResourceRow
                  key={r.id}
                  resource={r}
                  revealed={revealed.has(r.id)}
                  onToggleSensitive={() => onToggleSensitive(r)}
                  onToggleRevealed={() => onToggleRevealed(r.id)}
                  onDelete={() => onDeleteResource(r.id)}
                />
              ))}
            </ul>
          </SortableContext>
          {showAdd ? (
            <AddResourceForm
              onCancel={() => setShowAdd(false)}
              onSubmit={async (input) => {
                await onAddResource(input)
                setShowAdd(false)
              }}
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setShowAdd(true)}
            >
              <Plus />
              Add resource
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

// ─── Resource row (sortable + visual) ───────────────────────────────────────

function SortableResourceRow({
  resource,
  revealed,
  onToggleSensitive,
  onToggleRevealed,
  onDelete,
}: {
  resource: Resource
  revealed: boolean
  onToggleSensitive: () => void
  onToggleRevealed: () => void
  onDelete: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: resourceDndId(resource.id) })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <li ref={setNodeRef} style={style}>
      <ResourceRowInner
        resource={resource}
        revealed={revealed}
        onToggleSensitive={onToggleSensitive}
        onToggleRevealed={onToggleRevealed}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </li>
  )
}

function ResourceRowInner({
  resource,
  revealed,
  onToggleSensitive,
  onToggleRevealed,
  onDelete,
  dragging,
  dragHandleProps,
}: {
  resource: Resource
  revealed: boolean
  onToggleSensitive: () => void
  onToggleRevealed: () => void
  onDelete: () => void
  dragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
}) {
  const shown = !resource.isSensitive || revealed
  const isLink =
    resource.value.startsWith("http://") ||
    resource.value.startsWith("https://")

  function copy() {
    void navigator.clipboard?.writeText(resource.value)
  }

  return (
    <div
      className={`group/row flex flex-wrap items-center gap-2 rounded-md border bg-card px-2 py-1.5 ${
        dragging ? "shadow-lg ring-1 ring-primary/30" : ""
      }`}
    >
      {dragHandleProps ? (
        <button
          type="button"
          aria-label="Drag resource"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
          {...dragHandleProps}
        >
          <GripVertical className="size-3.5" />
        </button>
      ) : (
        <span className="p-1 text-muted-foreground/40">
          <GripVertical className="size-3.5" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{resource.name}</span>
          {resource.isSensitive && (
            <Badge variant="outline" className="text-[10px]">
              <Lock />
              sensitive
            </Badge>
          )}
        </div>
        <div className="truncate font-mono text-xs text-muted-foreground">
          {shown ? (
            isLink ? (
              <a
                href={resource.value}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {resource.value}
              </a>
            ) : (
              resource.value
            )
          ) : (
            "•".repeat(
              Math.min(24, Math.max(8, resource.value.length))
            )
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={resource.isSensitive ? "Unmark sensitive" : "Mark sensitive"}
        onClick={onToggleSensitive}
        title={resource.isSensitive ? "Unmark sensitive" : "Mark sensitive"}
      >
        <Lock />
      </Button>
      {resource.isSensitive && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={revealed ? "Hide value" : "Reveal value"}
          onClick={onToggleRevealed}
        >
          {revealed ? <EyeOff /> : <Eye />}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Copy value"
        onClick={copy}
      >
        <Copy />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="opacity-0 group-hover/row:opacity-100"
        aria-label={`Delete ${resource.name}`}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

// ─── Add resource form ──────────────────────────────────────────────────────

function AddResourceForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (input: {
    name: string
    value: string
    isSensitive: boolean
  }) => Promise<void> | void
}) {
  const [name, setName] = React.useState("")
  const [value, setValue] = React.useState("")
  const [isSensitive, setIsSensitive] = React.useState(false)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim() || !value.trim()) return
        void onSubmit({ name: name.trim(), value, isSensitive })
        setName("")
        setValue("")
        setIsSensitive(false)
      }}
      className="flex flex-col gap-2 rounded-md border border-dashed bg-muted/30 p-2"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="new-resource-name" className="text-xs">
            Name
          </Label>
          <Input
            id="new-resource-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Staging URL, API key, Figma link…"
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="new-resource-value" className="text-xs">
            Link or value
          </Label>
          <Input
            id="new-resource-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://… or secret"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={isSensitive}
            onChange={(e) => setIsSensitive(e.target.checked)}
            className="size-3.5"
          />
          <Lock className="size-3" />
          Sensitive (hidden by default)
        </label>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <X />
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!name.trim() || !value.trim()}
          >
            <Save />
            Add
          </Button>
        </div>
      </div>
    </form>
  )
}
