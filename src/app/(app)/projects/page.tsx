"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown, Plus, Trash2 } from "lucide-react"

import { AddProjectDialog } from "@/components/add-project-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/ui/status-pill"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useProjects, type Project, type ProjectStage } from "@/lib/projects-context"
import { PROJECT_STAGE_TONE, TONE_CLASSES } from "@/lib/status-colors"

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" })

const STAGE_LABEL: Record<ProjectStage, string> = {
  demo: "Demo",
  in_progress: "In progress",
  archived: "Archived",
}

type Filter = "active" | "demo" | "in_progress" | "archived" | "all"

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "active", label: "Active" },
  { id: "demo", label: "Demo" },
  { id: "in_progress", label: "In progress" },
  { id: "archived", label: "Archived" },
  { id: "all", label: "All" },
]

function matchesFilter(p: Project, f: Filter): boolean {
  if (f === "all") return true
  if (f === "active") return p.stage !== "archived"
  return p.stage === f
}

export default function ProjectsPage() {
  const {
    projects,
    isLoading,
    error,
    removeProject,
    setStage,
    legacyLocalProjectCount,
    importLegacyLocalProjects,
  } = useProjects()
  const [filter, setFilter] = React.useState<Filter>("active")
  const [importing, setImporting] = React.useState(false)

  const visible = projects.filter((p) => matchesFilter(p, filter))

  async function handleImport() {
    setImporting(true)
    try {
      await importLegacyLocalProjects()
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            All client projects in one place.
          </p>
        </div>
        <AddProjectDialog
          trigger={
            <Button>
              <Plus />
              Add project
            </Button>
          }
        />
      </div>

      {legacyLocalProjectCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-dashed bg-muted/40 px-4 py-3 text-sm">
          <span>
            Found {legacyLocalProjectCount} project
            {legacyLocalProjectCount === 1 ? "" : "s"} saved locally from before
            the Supabase switch. Import them?
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleImport}
            disabled={importing}
          >
            {importing ? "Importing…" : "Import"}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? "default" : "outline"}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {projects.length === 0 ? (
                    <>
                      No projects yet. Click{" "}
                      <span className="font-medium">Add project</span> to create
                      one.
                    </>
                  ) : (
                    <>No projects match this filter.</>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/projects/${p.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {p.clientName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/projects/${p.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {p.projectName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        nativeButton={false}
                        render={
                          <StatusPill
                            tone={PROJECT_STAGE_TONE[p.stage]}
                            dot
                            className="cursor-pointer"
                          >
                            {STAGE_LABEL[p.stage]}
                            <ChevronDown className="size-3" />
                          </StatusPill>
                        }
                      />
                      <DropdownMenuContent align="start">
                        {(Object.keys(STAGE_LABEL) as ProjectStage[]).map(
                          (s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => {
                                if (s !== p.stage) void setStage(p.id, s)
                              }}
                              className="gap-2"
                            >
                              <span
                                className={`size-2 rounded-full ${TONE_CLASSES[PROJECT_STAGE_TONE[s]].dot}`}
                              />
                              {STAGE_LABEL[s]}
                            </DropdownMenuItem>
                          )
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dateFormatter.format(new Date(p.createdAt))}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${p.projectName}`}
                      onClick={() => void removeProject(p.id)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
